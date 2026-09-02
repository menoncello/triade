/**
 * TEA Automate — E2E Umbrella Tests for 8-6 SFX haptics (expo-audio thock coupled with haptics)
 * Location: _bmad-output/test-artifacts/tests/e2e/sfx.umbrella.spec.ts
 * Runner: Manual device smoke (real iPhone dev build, Expo 57, Reanimated 4 + Skia 2.6.2 + expo-audio 57.0.3)
 * TEA mapping: "E2E" = device Skia/Reanimated + expo-audio verification (no Playwright page.goto for RN).
 * This file documents the E2E journeys as spec map for traceability,
 * but execution is manual per test-design P1 device smoke + FR-30 keep-sound. Host automation
 * covers all automatable surfaces; only expo-audio thock weighting + Taptic co-fire + Reanimated
 * timing remain device-only (placeholder wav degrade is host-gated via P2-06 expected RED).
 *
 * Each journey below maps to an ATDD source-structure gate in
 * triade/__tests__/feel/sfx.atdd.test.ts (P0-01..10, P1-01..05, P2-01..06) plus the
 * exit-criteria device smoke checklist (test-design-epic-8-6-sfx-haptics.md P1).
 *
 * Spec: spec-8-6-sfx-haptics.md (S8.6, UX-DR-29, FR-30, UX-DR-16, 4 ACs, I/O matrix 8 rows, baseline 7e1916a→b16a06e)
 * Delta: triade/src/feel/sfx.ts (new 152 LOC, VOLUME_BY_HAPTIC + SfxGateway + expo-audio dual API 57.0.3)
 *        triade/src/services/assets/assetManifest.ts (+36 LOC, sfx-merge/spawn/gameover degrade)
 *        triade/App.tsx (+20 LOC, coupled triggerSfxForTrace/ForSpawn/ForGameOver after haptics at same doMove site)
 *        triade/package.json (expo-audio ~57.0.3 + expo-haptics ~57.0.1 pinned)
 *        triade/__tests__/feel/sfx.test.ts (new 11 pins) + punch.atdd wiring fix (8-5 residual)
 *
 * To run host gates that back these E2E journeys:
 *   cd triade && npm test -- __tests__/feel/sfx.atdd.test.ts --test-name-pattern "P0-|P1-"
 *   npx tsx --test ../_bmad-output/test-artifacts/tests/api/sfx.gateway.spec.ts
 *   npx tsx --test ../_bmad-output/test-artifacts/fixtures/feel-sfx-fixtures.ts  # perf sweep helper
 *
 * Device smoke (15 min, portrait+landscape, real iPhone, until mastering lands silent is ship path):
 *   1. Build dev: npx expo run:ios  (expo-audio 57.0.3 prebuild — see sfx.ts createAudioPlayer vs AudioPlayer dual branch)
 *   2. Without assets/sfx/ wavs: launch succeeds, first merge silent (no thock) but no crash (degrade path)
 *   3. With 3 wavs mastered under triade/assets/sfx/: merge/spawn/gameover audible thocks rank checked
 *   4. Toggle Settings → Reduced Motion ON / iOS Reduce Motion ON — thocks at same scaled volume while visuals flat
 */

// This file is intentionally NOT executed via `npm test` — it is a TEA E2E artifact
// under test_artifacts/tests/e2e per _bmad/tea/config.yaml. Importing it would fail
// without a device (expo-audio needs native module + wav assets). Host gates live in
// sfx.atdd.test.ts + sfx.gateway.spec.ts + feel-sfx-fixtures.ts perf sweep.

export const E2E_JOURNEYS = {
  // P0 E2E-01: Merge SFX scaled by tile value mirroring haptic scale (AC2, S8.6 / UX-DR-29, R-001)
  'E2E-01 merge SFX scaled 3→0.45 / 6→0.65 / 12+→1.0 coupled (P0, S8.6)': {
    priority: 'P0',
    level: 'E2E (device manual + host gateway)',
    ac: 'AC2 (S8.6, UX-DR-29)',
    risk: 'R-001 (BUS 6)',
    traceability: 'P0-01 sfxVolumeForValue tier + P0-04 coupled haptics+audio + P0-06 per-merge scaled volume',
    steps: [
      'Given feel presets frozen (FEEL_PRESETS 3 light / 6 medium / 12+ heavy via presetFor)',
      'When sfxVolumeForValue(value) called for 3→0.45, 6→0.65, 12/24/48..1536→1.0 via VOLUME_BY_HAPTIC {0.45/0.65/1.0}',
      'Then sound scales with tile value mirroring haptic scale (data not code, single VOLUME_BY_HAPTIC)',
      'And hapticsStyleForValue(3) Light+0.45 / 6 Medium+0.65 / 12 Heavy+1.0 same tier, same order, same entry',
      'And triggerSfxForTrace fires one SFX per merge entry (from.length===2 && !spawned && Array.isArray(from)) with scaled volume',
    ],
    hostGate: 'sfx.atdd.test.ts [P0-01][P0-04][P0-06] + sfx.gateway.spec.ts [P0] volume scale + coupled suite + fixture sfxGatewayContract',
    device:
      'Merge 3 → light haptic + soft thock 0.45 (or silent until mastering), 6 → medium 0.65, 12+ → heavy 1.0 — ear confirms rank 0.45<0.65<1.0 same as haptic Light<Medium<Heavy',
  },

  // P0 E2E-02: Spawn + gameOver SFX single-fire at fixed volumes, never blocked (AC1, R-005, R-006)
  'E2E-02 spawn 0.35 + gameOver 0.9 single-fire, thin observer never blocks (P0, S8.6)': {
    priority: 'P0',
    ac: 'AC1 + AC3 (S8.6, architecture)',
    risk: 'R-005 (TECH 4), R-002 (TECH 6), R-006 (TECH 4)',
    steps: [
      'Given trace observer at App.tsx doMove after setMoveResult + triggerHapticsForTrace',
      'When result.trace contains merge entries → triggerSfxForTrace per entry at scaled volume',
      'And result.moved && spawn entry exists (trace.find(e=>e.spawned)) → triggerSfxForSpawn at fixed 0.35 regardless of value param',
      'And result.moved && isGameOver(nextBoard) → triggerSfxForGameOver at 0.9 fall thock',
      'Then all are thin swappable observers: SfxGateway injectable, dispatchPlay prefers gateway else void playViaExpoAudio dynamic import best-effort catch→null, never throws, never awaits, never blocks move()',
      'And NOOP (moved false) or empty/null/undefined trace → 0 SFX, never throws',
    ],
    hostGate: 'sfx.atdd.test.ts [P0-05] NOOP + [P0-06] per-merge + [P0-07] kind+volume + [P0-08] swappable + [P0-09] never-throw + [P1-01] trace fixtures',
    device: 'Every swipe that spawns → soft 0.35 spawn thock; game over → single fall 0.9 thock; NOOP swipe → silence; no music ever (3-kind cap)',
  },

  // P0 E2E-03: No music — only merge/spawn/gameOver 3 kinds in MVP (AC1, UX-DR-29)
  'E2E-03 no music 3-kind cap merge/spawn/gameOver (P0, UX-DR-29)': {
    priority: 'P0',
    ac: 'AC1 (UX-DR-29, S8.6)',
    risk: 'R-007 (OPS 3)',
    steps: [
      'Given SfxKind = merge|spawn|gameOver (SfxKind 3-way allowlist)',
      'When any trigger (merge/spawn/gameOver/trace) fires via gateway or default expo-audio path',
      'Then only merge/spawn/gameOver kinds ever emitted — no music/bgm/loop in MVP (spec Never add music or looping background audio)',
      'And sfxKindForValue always merge (no pitch table MVP, volume alone carries thock weight)',
      'And static scan: lower(sfx.ts) has zero music/loop literals outside tests',
    ],
    hostGate: 'sfx.atdd.test.ts [P0-10] 3-kind cap + sfx.gateway.spec.ts [P0] no-music allowlist + fixture isOnlySfxKinds',
    device: 'Device: only thock1s heard (merge/spawn/gameOver), never music/bgm/loop — cap is binary scan gate host + ear on device',
  },

  // P0 E2E-04: Swappable gateway + never-throw/never-block contract (AC3, architecture)
  'E2E-04 swappable gateway SfxGateway { play } + never throw/never await/never block (P0, TECH 6)': {
    priority: 'P0',
    ac: 'AC3 (architecture)',
    risk: 'R-002 (TECH 6), R-003 (TECH 6)',
    steps: [
      'Given sfx.ts exposes SfxGateway { play: (kind, volume) => void } injectable param on every trigger',
      'When gateway provided → dispatchPlay(gateway.play) called synchronously with correct kind+volume',
      'And gateway absent → void playViaExpoAudio via getAudioModule() cached void import(expo-audio).catch(()=>null) dual API createAudioPlayer vs AudioPlayer + setVolume/volume + seekTo(0) + play()/replay() each in try/catch, Math.max(0, min(1, vol)) clamp',
      'And gateway.play throws → swallowed by try/catch never throws caller (haptics still attempted via separate try in App.tsx)',
      'And caller never awaits triggerSfx (rg await.*triggerSfx empty except internal await modPromise inside fire-and-forget void)',
      'Then 7+ try/catch guards pin never-throw; App.tsx has ≥4 try blocks (1 haptics + 3 sfx) each fire-and-forget, never gates next swipe',
    ],
    hostGate: 'sfx.atdd.test.ts [P0-08][P0-09][P1-04] + sfx.gateway.spec.ts [P0] gateway degrade + swappable + perf sweep',
    device: 'Rapid double merge 6+12 within ~50ms + EARLY_INPUT_MS 84 window: both SFX dispatched without blocking next swipe, last audible wins via seekTo(0) (R-009 rare, acceptable)',
  },

  // P1 E2E-05: App coupling — triggerHapticsForTrace + 3 triggerSfx at same doMove site after triggerHapticsForTrace (R-002, R-004)
  'E2E-05 App.tsx coupling same call site fire-and-forget, never reducedMotion-gated (P1, R-002/R-004)': {
    priority: 'P1',
    ac: 'AC2+AC4 (S8.6 coupled + FR-30)',
    risk: 'R-002 (TECH 6), R-004 (BUS 6)',
    steps: [
      'Given App.tsx doMove after triggerHapticsForTrace(result.trace) (FR-30 stays)',
      'When result is effective (result.moved) → triggerSfxForTrace(result.trace) for merges, trace.find(e=>e.spawned) + Number.isFinite → triggerSfxForSpawn, isGameOver(nextBoard) → triggerSfxForGameOver',
      'Then each in its own try/catch no-throw, never await, never gated on settings.reducedMotion (FR-30: Reduced Motion keeps sound)',
      'And sfxLines have zero reducedMotion token (unlike GameBoard/GameOverOverlay which gate visuals)',
      'And totalTry >=4 (1 haptics + 3 sfx) so haptics failure never suppresses audio and vice versa (separate blocks, haptics before sfx)',
    ],
    hostGate: 'sfx.atdd.test.ts [P1-02] coupling grep + [P1-04] independence + [P1-05] FR-30 wiring regression + sfx.gateway.spec.ts [P1] App coupling suite',
    device: 'Device: merges fire both haptics+thock at same instant (couple); toggle Reduce ON → thocks at same scaled volume while visuals flat (same as 8-5 umbrella gate but SFX semantic)',
  },

  // P1 E2E-06: Reduced Motion keeps sound — sfx never reads reducedMotion, volume via presetFor not reducedPresetFor (AC4, FR-30/UX-DR-16)
  'E2E-06 FR-30 Reduced Motion keeps sound — sfx never gated (P1, FR-30)': {
    priority: 'P1',
    ac: 'AC4 (FR-30, UX-DR-16)',
    risk: 'R-004 (BUS 6)',
    steps: [
      'Given Reduced Motion enabled (settings.reducedMotion true, gameBoard reducedMotion true)',
      'When sfxVolumeForValue(value) called for 3/6/12/1536',
      'Then volume identical regardless of reducedMotion: reducedPresetFor preserves haptic so presetFor(v).haptic→VOLUME same',
      'And sfx.ts never imports reducedMotion/settings/reducedPresetFor (only // FR-30: Reduced Motion keeps sound comment allowed, code grep reducedMotion empty)',
      'And sfxVolumeForValue derives from presetFor(value).haptic, not reducedPresetFor (data not code violation if drifted)',
      'And App.tsx sfxLines have zero reducedMotion token (visual gates still thread reducedMotion={settings.reducedMotion} to GameBoard + GameOverOverlay ≥2 sites)',
      'And punch.atdd S8.5 wiring fix remains green (GameOverOverlay not hardcoded false)',
    ],
    hostGate: 'sfx.atdd.test.ts [P0-03][P1-05] + sfx.gateway.spec.ts [P0] Reduced Motion keeps sound + fixture sfxKeepsSoundUnderReducedMotion',
    device: 'Reduce Motion ON → repeat merges 3/6/12/1536 + spawn + game over → thocks at same scaled volume + haptics still felt, visuals flat (board still board-only per 8-5, audio is orthogonal non-visual so chrome guard vacuously true)',
  },

  // P1 E2E-07: assetManifest preload degrade — 3 placeholder sfx assets degrade to null when absent (R-003, R-008)
  'E2E-07 assetManifest sfx-merge/spawn/gameover preload degrade silent (P1, R-003)': {
    priority: 'P1',
    ac: 'AC1 + NFR-3 (offline/installability)',
    risk: 'R-003 (TECH 6), R-008 (OPS 3)',
    steps: [
      'Given triade/assets/sfx/ absent dir current state (verify: ls triade/assets/sfx/ missing is expected; gateway degrades via try/catch→null early-return if(!source) return)',
      'When assetManifest sfx-merge/spawn/gameover entries resolve via require(../../../assets/sfx/*.wav) wrapped in try/catch→null',
      'And preloadAssets does map(resolve).filter(finite) + if(!resources.length) return before Asset.loadAsync, await import(expo-asset) in try/catch',
      'Then launch succeeds without sfx assets: preload silent, first merge silent (no thock) but no crash — degrade path is ship path until mastering lands',
      'And 6-site require allowlist is exactly 6 (3 manifest + 3 sfx) spelled merge.wav/spawn.wav/gameover.wav identically, each in try/catch',
      'When mastering lands 3 wavs under triade/assets/sfx/ with same literals (already wired in both manifests) → [P2-06] flips GREEN + ear rank 0.45/0.65/1.0 vs 0.35/0.9 becomes audible without code change',
    ],
    hostGate: 'sfx.atdd.test.ts [P1-03] manifest degrade + [P2-02] 6-site require allowlist + sfx.gateway.spec.ts [P1] assetManifest suite',
    device: 'Fresh install via npx expo prebuild without assets/sfx/ → launch succeeds, NOOP silent no-crash; after mastering: thocks rank audible 3 0.45 / 6 0.65 / 12+ 1.0 / spawn 0.35 / gameOver 0.9',
  },

  // P1 E2E-08: Device smoke integrated journey — portrait+landscape, airplane, NOOP, all combs (P1 smoke)
  'E2E-08 device smoke integrated thock rank + FR-30 + NOOP + chrome (P1, integrated smoke)': {
    priority: 'P1',
    level: 'E2E (device manual, ~15 min, iOS dev build SDK 57)',
    ac: 'All ACs (integrated)',
    risk: 'R-001, R-003, R-004, R-005',
    steps: [
      'Given portrait+landscape (both pistes, 60/40 preview pipelines) + Settings reducedMotion toggle + board 4×4 feel pipeline (punch 8-2 + shake 8-3 + bullet 8-4 + sfx 8-6 + reduced 8-5)',
      'When (Reduced OFF) merge 3 subtle (shake 2 / punch 1.08 + thock 0.45) → 6 medium (shake 2 + thock 0.65) → 12 heavy (shake 5 capped 8 + punch 1.15 + flash/burst/overshoot + heavy haptics + thock 1.0) → spawn soft 0.35 → game over soft fade280 + fall 0.9 thock → all co-fire without blocking next swipe; rapid 6+12 within ~50ms both dispatched last audible wins via seekTo(0)',
      'And toggle Reduce ON → repeat each: board flat (shake 0/punch 1/flash false/bullet suppressed per 8-5) but thocks at SAME scaled volume 0.45/0.65/1.0 + haptics Light/Medium/Heavy still felt, visuals flat (Hud preview card & score never shake/flash even when board does per 8-5 board-only chrome guard)',
      'And NOOP slide (fromLen 1 no merge) → silence (0 SFX) + no haptics; spawn-only → 0 merge SFX (only spawn thock on next true move)',
      'And AIRPLANE offline → same (expo-audio already bundled ~57.0.3, expo-asset bundled, no new CDN/network, promise cached audioModulePromise)',
      'And mid-shake/bullet toggle mid-flight still snaps visuals only (GameBoard snap preserved after 8-6 coupling — audio unaffected)',
      'Then exit-criteria smoke is PASS — sign-off checkbox in PR description (device sfx smoke: 3/6/12 + spawn/gameOver + FR-30 ON flat while audible + chrome + mid-flight snap + NOOP + airplane; when placeholder P2-06 RED, silent no-crash is expected PASS, thock rank deferred)',
    ],
    hostGate: 'All host P0/P1 GREEN (sfx.atdd 20/21 + sfx.gateway 12/12 + sfx.test 11/11 + feel bullet/shake/punch guards) + sfx.gateway.spec.ts [P1] real trace + [P1] assetManifest; device is the only remaining automatable gap (expo-audio native module + wav mastering)',
    device: 'Real iPhone dev build — one run covers E2E-01..07; video side-by-side heavy vs Hud proves chrome guard + thock rank',
  },

  // P2 E2E-09: SDK 57 pin + duplicate-require + merge-predicate 5-site allowlist + perf micro-bench (P2, deferred mastering)
  'E2E-09 SDK pin + 6-site require + 5-site predicate + perf micro-bench (P2, TECH/OPS)': {
    priority: 'P2',
    ac: 'NFR performance + maintainability (single-source)',
    risk: 'R-007 (TECH 3), R-008 (OPS 3), R-005 (TECH 4), R-009 (PERF 2), R-010 (OPS 1)',
    steps: [
      'Given VOLUME_BY_HAPTIC single-source in sfx.ts (0.45/0.65/1.0 light/medium/heavy) via presetFor(value).haptic — no volume literals outside sfx.ts (except test-allowlist)',
      'When expo-audio 57.0.3 + expo-haptics 57.0.1 pinned in package.json under Pinned Version Matrix (SDK 57 prebuild clean)',
      'And sfx.ts handles dual API createAudioPlayer vs AudioPlayer + setVolume/volume + seekTo(0)+play()/replay() branches (upgrade re-smoke required)',
      'And exactly 6 require(assets/sfx) sites (3 manifest + 3 sfx) spelled merge/spawn/gameover.wav each in try/catch (duplicate seam, bundled id must match when mastered)',
      'And merge predicate from.length===2 && !spawned (+ Array.isArray) only in haptics/shake/bulletTime/sfx + transitionPlan 5-site allowlist (no 6th duplicate predicate)',
      'And sfxVolumeForValue host-cheap micro-bench 1000× (sfxVolumeForValue + triggerSfxForTrace) median <0.05ms / p99 <0.1ms (no new <0.1ms budget beyond existing feel bench <0.1ms)',
      'And rapid multi-merge within EARLY_INPUT_MS≈84ms re-trigger seekTo(0) last-wins acceptable rarity (no per-entry player pool MVP, spec residual)',
      'Then S8.6 thin layer is maintainable (single VOLUME + single 3-kind + single predicate) + perf-budgeted (host thock adds 0 frame cost, async void off main worklet, p99 device lane 2-min play must stay <16.7ms)',
    ],
    hostGate: 'sfx.atdd.test.ts [P2-01] SDK pin + [P2-02] 6-site allowlist + [P2-03] 5-site predicate + [P2-04] bench median/p99 + [P2-05] last-wins',
    device: 'Device lane: 2-min play 5 new-bests (including heavy thock+punch+shake+bullet co-fire) while OFF + one heavy co-fire + one Reduce ON flat → p99Ms <16.7 (audio off main thread must not regress device p99)',
  },

  // P2 E2E-10: Placeholder mastering present — EXPECTED RED until mastering lands, degrade to silent no-op is ship path (P2, deferred — same as spec Residual)
  'E2E-10 placeholder mastering — triade/assets/sfx/ 3 wavs present EXPECTED RED (P2, deferred)': {
    priority: 'P2',
    ac: 'AC1 (S8.6, UX-DR-29) + NFR-3 / offline degrade',
    risk: 'R-003 (TECH 6, deferred)',
    status: 'EXPECTED RED — placeholder mastering absent; degrade to silent no-op is current ship path (add 3 wavs to flip GREEN)',
    steps: [
      'Given triade/assets/sfx/ directory currently absent (expected until mastering lands — gate tries require(assets/sfx/*.wav) catch→null early-return if(!source) return so no crash, but also no thock on device)',
      'When 3 thock wavs cálido (merge.wav/spawn.wav/gameover.wav, no music) mastered and added under triade/assets/sfx/ with same literals as manifest (sfx-merge/spawn/gameover) + sfx.ts (6-site allowlist)',
      'Then [P2-06] host spec triade/__tests__/feel/sfx.atdd.test.ts: Expected all 3 sfx wavs present — flips GREEN after mastering',
      'And device smoke confirms rank 0.45/0.65/1.0 vs 0.35/0.9 audible (currently asserts silent no-crash, not thock rank)',
      'And no code change required beyond asset drop (both manifests already wired try/catch→null → numeric asset id when present; preloadAssets filter picks them up)',
      'Deferred work tracked in spec-8-6-sfx-haptics.md Residual risks + test-design-epic-8-6-sfx-haptics.md R-003 — not threshold for 8-6 close',
    ],
    hostGate: 'sfx.atdd.test.ts [P2-06] — currently RED until mastering; fix: add mastered thocks with same literals (6-site allowlist in sync) + re-run npm --prefix triade test -- __tests__/feel/sfx.atdd.test.ts --test-name-pattern "P2-06" → GREEN then device ear re-check 3 0.45 / 6 0.65 / 12+ 1.0 / spawn 0.35 / gameOver 0.9 audible + Reduce ON same',
  },
} as const;

// For TEA traceability: priority counts for this E2E artifact
export const PRIORITY_COVERAGE = { P0: 4, P1: 4, P2: 2, P3: 0 } as const;
export const TEST_COUNT = 10;

// TEA checklist alignment:
// - P0 E2E tracks S8.6 volume scale mirroring haptic + spawn/gameOver kinds + no-music 3-kind + swappable never-throw/never-block — blocks merge.
// - P1 E2E tracks App coupling same-site + FR-30 keep-sound + manifest degrade + integrated device smoke — pre-merge device gate.
// - P2 E2E tracks SDK pin + duplicate-require/merge-predicate allowlists + bench + last-wins + placeholder mastering deferred — deferred low, not S0/S1 (currently P2-06 EXPECTED RED).
