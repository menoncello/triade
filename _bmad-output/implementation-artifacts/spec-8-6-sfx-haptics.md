---
title: '8-6 SFX haptics'
type: 'feature'
created: '2026-09-01'
status: 'done'
baseline_revision: '7e1916a27b1b217fc0bc5ff6094ab874b0b294e5'
final_revision: '52bd3e5a9c568c4d6f94d66dde1a7d15512236ed'
review_loop_iteration: 1
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** Big merges feel tactile but are silent — without minimal SFX the "O Merge como Momento" peak lacks its coupled audio half, violating S8.6/UX-DR-29 and leaving Reduced Motion with only haptics.

**Approach:** Add a thin, swappable expo-audio observer (`src/feel/sfx.ts`) that plays minimal SFX (merge/spawn/game-over, no music) scaled by tile value mirroring the haptic scale (3 light → 12+ heavy), coupled with haptics at the same call site, never blocking gameplay and staying active under Reduced Motion.

## Boundaries & Constraints

**Always:** Engine stays pure (ADR-01); feel/audio are observers of trace/events only; SFX mapping is data via `FeelPreset`/`presetFor` (data not code); expo-audio dynamic import best-effort never throws/never awaits; sound+haptics coupled per merge value; Reduced Motion keeps sound (FR-30); no music in MVP; swappable gateway (injectable player/mock).

**Block If:** Requires new native module beyond pinned expo-audio SDK 57.0.3 / expo-haptics / Reanimated/Skia, or changing engine spawn/merge/score rules, or acquiring real audio mastering beyond placeholder thock assets.

**Never:** Add music or looping background audio; gate sound behind `reducedMotion`; block or delay `move()` dispatch on audio; duplicate merge predicate outside engine; exceed 3 SFX kinds in MVP; animate chrome with feel effects.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Merge SFX | trace with merge value 3/6/12+ | `triggerSfxForTrace` fires one SFX per merge entry, volume 0.45/0.65/1.0 via `sfxVolumeForValue` (mirrors light/medium/heavy) | never throws, dynamic import failure swallowed |
| Spawn SFX | spawn tile value 1/2/3 | `triggerSfxForSpawn` fires single soft spawn thock (fixed low volume) | never throws |
| Game-over SFX | `MatchOver` / isGameOver true | `triggerSfxForGameOver` fires single game-over thock | never throws, no throw if called outside game over |
| Coupled | merge trace 6+12 | haptics+audio both fire per entry, same value scale, same order | haptics failure never suppresses audio and vice versa |
| Reduced Motion ON | reducedMotion=true, merge 12 | audio still fires at full scaled volume, haptics still fire (FR-30) | never gated |
| NOOP / no merge | empty trace or moved false | no audio, no haptics | silent no-op |
| Missing expo-audio | module not installed in test | gateway degrades to no-op, `sfxVolumeForValue` pure still returns datum | never throws, test seam `sfxVolumeForValue` stays host-testable |
| Swappable | injected `AudioGateway` mock | `triggerSfxForTrace(trace, gateway)` uses injected gateway when provided | falls back to default dynamic import when null |

</intent-contract>

## Code Map

- `triade/src/feel/feel.ts` -- source of truth: `FeelPreset`, `presetFor` — sfx volume/pitch derive from same tier band (data not code)
- `triade/src/feel/haptics.ts` -- existing gateway that stays coupled with audio at same call site (`App.tsx:doMove`) and never reads reducedMotion
- `triade/src/feel/sfx.ts` -- NEW: pure `sfxVolumeForValue` + swappable gateways `triggerSfxForMerge/ForTrace/ForSpawn/ForGameOver`; dynamic import `expo-audio` best-effort, never throws, never blocks
- `triade/App.tsx` -- owns move dispatch; threads `triggerHapticsForTrace` + `triggerSfxForTrace/ForSpawn/ForGameOver` after `setMoveResult`; Reduced Motion does NOT gate audio
- `triade/src/services/assets/assetManifest.ts` -- preloads 3 SFX assets (merge/spawn/game-over) via `expo-asset` if available; degrades to no-op when assets missing
- `triade/__tests__/feel/sfx.test.ts` -- NEW: pins volume scale 3/6/12+, reducedMotion keep-sound, NOOP silence, never-throw, swappable gateway contract
- `triade/__tests__/feel/feel.test.ts` -- existing haptic pins that couple verification can reference
- `triade/benchmarks/feel.bench.test.ts` -- existing sweep to extend with sfx volume mapping (no new timing budget beyond existing <0.1ms)
- `triade/package.json` / `triade/app.json` -- pinned `expo-audio 57.0.3` dependency (Pinned Version Matrix)

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/feel/sfx.ts` -- create swappable SFX gateway: export `sfxVolumeForValue(value): number` pure (3→0.45, 6→0.65, 12+→1.0 via presetFor tier, never throws on non-finite), `sfxKindForValue` if needed, and `triggerSfxForMerge(value, gateway?)`, `triggerSfxForTrace(trace, gateway?)`, `triggerSfxForSpawn(value, gateway?)`, `triggerSfxForGameOver(gateway?)`; dynamic import `expo-audio` (`createAudioPlayer`/`AudioPlayer` SDK 57) best-effort fire-and-forget, catch-all, never await/block; injectable gateway param for tests (`{ play: (kind, volume) => void }`); FR-30 comment `// FR-30: Reduced Motion keeps sound — never gate`.
- [x] `triade/src/services/assets/assetManifest.ts` -- register 3 placeholder SFX assets (`sfx-merge`, `sfx-spawn`, `sfx-gameover`) if files exist under `triade/assets/sfx/`; preload via `expo-asset` same pattern as icon/splash; degrade to no-op when files absent (no throw, no block).
- [x] `triade/App.tsx` -- couple audio with haptics: after `triggerHapticsForTrace(result.trace)` in `doMove`, also call `triggerSfxForTrace(result.trace)` for merges and `triggerSfxForSpawn(spawnValue)` when `result.moved && result.pendingSpawn` spawns, and `triggerSfxForGameOver()` when `isGameOver(nextBoard)` transitions; never gate on `settings.reducedMotion`; never await; wrap each in try/catch no-throw.
- [x] `triade/package.json` + `triade/app.json` -- ensure `expo-audio ~57.0.3` in dependencies and prebuild compatible (no extra config needed beyond install); keep Pinned Version Matrix comment.
- [x] `triade/__tests__/feel/sfx.test.ts` -- create tests pinning sfxVolumeForValue 3/6/12+ (mirrors haptic light/medium/heavy), reducedMotion keep-sound (gateway does not read reducedMotion), NOOP/empty/null never throws, game-over/ spawn single-fire, coupled haptics+audio same scale, swappable gateway receives correct kind+volume, missing expo-audio degrades silent.

**Acceptance Criteria:**
- Given a merge, spawn, or game over, when the audio observer reacts, then minimal SFX play via expo-audio: merge, spawn, game-over — no music in MVP (S8.6, UX-DR-29)
- Given a merge tile value, when SFX volume is resolved, then sound scales with tile value mirroring haptic scale (3 light → 12+ heavy); sound and haptics are coupled (S8.6, UX-DR-29)
- Given the audio layer, when called, then it is a thin, swappable observer — never blocks or alters gameplay (architecture, audio)
- Given Reduced Motion enabled, when a merge resolves, then sound remains fully active alongside haptics (FR-30, UX-DR-16)

## Spec Change Log

## Review Triage Log

### 2026-09-01 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 2: (high 0, medium 0, low 2)
- defer: 0
- reject: 0
- addressed_findings:
  - `[low]` `[patch]` punch.atdd P1-04 burst scaling test kept stale hardcoded `reducedMotion={false}` for GameOverOverlay — fixed assertion to pin S8.5 wiring `settings.reducedMotion` (not a product defect)
  - `[low]` `[patch]` package.json missing `expo-haptics` pin caused haptics.atdd P2-06 fail — added `expo-haptics ~57.0.1` to dependencies (Pinned Version Matrix)

## Design Notes

SFX reuse the same `FeelPreset` tier band as haptics — `sfxVolumeForValue` maps `presetFor(value).haptic` to 0.45/0.65/1.0. No pitch table in MVP; volume alone carries the cálido thock weight. `expo-audio` SDK 57 API is `createAudioPlayer(source)` → `player.play()`; gateway holds at most one player per kind and re-seeks to 0 before replay so rapid merges don't stack. Tests never import `expo-audio` — they inject a mock gateway and assert kind/volume.

## Verification

**Commands:**
- `npm --prefix triade test triade/__tests__/feel/sfx.test.ts` -- expected: all pass (volume scale, coupled, reducedMotion keep, noop silent, swappable)
- `npm --prefix triade test` -- expected: all pass except pre-existing 9 EXPECTED RED (feel ATDD deferred — same as 8-5 baseline)
- `npx tsc --noEmit --project triade/tsconfig.json` -- expected: clean
- `npx tsc --noEmit --project triade/tsconfig.test.json` -- expected: clean

**Manual checks (if no CLI):**
- Play: merge 3 → light haptic + soft thock; merge 6 → medium + louder thock; merge 12+ → heavy + full thock; spawn → soft thock; game over → single fall thock; no music ever. Toggle Reduced Motion ON → repeat each: audio still fires at same scaled volume, haptics still fire, no visual feel. Rapid double merge → both thocks heard without blocking next swipe.

## Auto Run Result

**Summary:** Implemented SFX haptics (S8.6) — minimal cálido thock via expo-audio (merge/spawn/game-over, no music) scaled by FeelPreset tier (3→0.45/6→0.65/12+→1.0) and coupled with haptics at the same trace observer; swappable gateway never blocks gameplay and stays active under Reduced Motion (FR-30).

**Files changed:**
- `triade/src/feel/sfx.ts` -- new swappable SFX gateway (`sfxVolumeForValue`, `triggerSfxForTrace/ForMerge/ForSpawn/ForGameOver`) dynamic import expo-audio best-effort, never throws, FR-30 kept
- `triade/src/services/assets/assetManifest.ts` -- registered 3 placeholder SFX assets (`sfx-merge/spawn/gameover`) with graceful degrade when files absent
- `triade/App.tsx` -- coupled `triggerSfxForTrace/ForSpawn/ForGameOver` after `triggerHapticsForTrace` in `doMove`; never gated on reducedMotion, never awaited
- `triade/package.json` -- added `expo-audio ~57.0.3` and `expo-haptics ~57.0.1` to pinned dependencies
- `triade/__tests__/feel/sfx.test.ts` -- new pins for volume scale, coupled, Reduced Motion keep, NOOP silence, swappable gateway, no-music guard
- `triade/__tests__/feel/punch.atdd.test.ts` -- fixed stale assertion that pinned literal `reducedMotion={false}` for GameOverOverlay (S8.5 wiring is `settings.reducedMotion`)
- `_bmad-output/implementation-artifacts/spec-8-6-sfx-haptics.md` -- spec file (this file)

**Review findings:**
- patches applied: 2 (punch.atdd wiring fix, package.json expo-haptics pin)
- items deferred: 0
- items rejected: 0
- followup_review_recommended: false

**Verification:**
- `triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` -- clean
- `triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.test.json` -- clean
- `npm --prefix triade test` -- 837 pass / 9 fail (all 9 EXPECTED RED deferred — same set as 8-5: bullet truncation, board overflow, tutorial dedup, burst orphan x2, shake/bullet overlap, shake concurrency, edge clipping)

**Residual risks:**
- Real thock mastering not bundled — sfx assets under `triade/assets/sfx/` are placeholders; gateway degrades to no-op until wav files land (no crash)
- Overlapping rapid merges <50ms re-trigger audio player re-seek; last wins (acceptable rarity, no stacking)
- Burst accumulation setTimeout orphan and overlapping shake cancelAnimation remain deferred pre-existing EXPECTED RED (not introduced by 8-6)
