/**
 * TEA Automate — E2E Umbrella Tests for 8-5 Reduced Motion (Preset-Gated Feel Umbrella)
 * Location: _bmad-output/test-artifacts/tests/e2e/reducedMotion.umbrella.spec.ts
 * Runner: Manual device smoke (real iPhone dev build, Expo 57, Reanimated 4 + Skia 2.6.2)
 * TEA mapping: "E2E" = device Skia/Reanimated verification (no Playwright page.goto for RN).
 * This file documents the E2E journeys as Playwright-style specs for traceability,
 * but execution is manual per test-design P1-07. Host automation covers all
 * automatable surfaces; only worklet timing + Taptic feel remain device-only.
 *
 * Each test below maps to an ATDD source-structure gate in
 * triade/__tests__/feel/reducedMotion.atdd.test.ts (P0-01..09, P1-01..06, P2-01..06) plus the
 * exit-criteria device smoke checklist (test-design-epic-8-5-reduced-motion.md section P1-07).
 *
 * Spec: spec-8-5-reduced-motion.md (FR-30, UX-DR-16, ADR-04, 5 ACs, I/O matrix 7 rows)
 * Delta: triade/App.tsx:929 GameOverOverlay wiring fix + feel.ts REDUCED_PRESET/reducedPresetFor +
 *        punch.ts/shake.ts/bulletTime.ts preset-not-flag + haptics.ts FR-30 comment +
 *        render/GameBoard.tsx board-only gating + ui/GameOverOverlay.tsx instant vs 280ms +
 *        benchmarks/feel.bench.test.ts both-profile sweep (baseline 10a3449→0ec7482).
 *
 * To run host gates that back these E2E journeys:
 *   cd triade && npm test -- __tests__/feel/reducedMotion.atdd.test.ts --test-name-pattern "P0-|P1-"
 *   cd triade && npx tsx --test ../_bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts
 *   npx tsx --test ../_bmad-output/test-artifacts/fixtures/feel-reduced-motion-fixtures.ts  # perf sweep helper
 *
 * Device smoke (15 min, portrait+landscape, real iPhone):
 *   1. Build dev: npx expo run:ios
 *   2. Toggle in-app Settings → Reduced Motion ON / iOS Settings → Accessibility → Motion → Reduce Motion ON
 *   3. Execute journey below, observe board stays flat while Hud preview card never translates
 */

// This file is intentionally NOT executed via `npm test` — it is a TEA E2E artifact
// under test_artifacts/tests/e2e per _bmad/tea/config.yaml. Importing it would fail
// without a device. Host gates live in reducedMotion.atdd.test.ts + reducedMotion.gateway.spec.ts.

export const E2E_JOURNEYS = {
  // P0 E2E-01: Full feel layer gated under Reduced Motion — umbrella (AC1, FR-30, UX-DR-16)
  'E2E-01 umbrella full layer gated (P0, FR-30 umbrella)': {
    priority: 'P0',
    level: 'E2E (device manual)',
    ac: 'AC1 (S8.5, FR-30, UX-DR-16)',
    risk: 'R-001 (BUS 6), R-002 (TECH 6)',
    traceability: 'P0-03 punch flat + P0-04 shake flat + P0-05 bullet gated + P0-07 glow 1536+ gated + P0-08 GameOver instant',
    steps: [
      'Given Reduced Motion enabled (settings.reducedMotion true, REDUCED_PRESET {0,0,0,1,false})',
      'When merges 3→subtle, 6→medium, 12→heavy, 1536→glow, new-best 12→bullet 200ms, game over→soft fade each resolve',
      'Then shake 0 (shakeMsFor→0, shouldShake→false, maxShakeForTrace→0)',
      'And bullet suppressed (shouldTriggerBulletTime(...,true)→false) while nextSessionBest still advances (12 vs 6 →12)',
      'And punch flash false / particles 0 / overshootScale 1 / overshootMs 0 for every tier (punchScaleFor→1)',
      'And 1536+ glow false (shouldGlow(1536,true)→false) — only glow in system flat',
      'And game-over soft fade 280ms cut to instant setValue(1)/0 (no Animated.timing)',
    ],
    hostGate:
      'reducedMotion.atdd.test.ts [P0-03][P0-04][P0-05][P0-07][P0-08] + reducedMotion.gateway.spec.ts [P0] punch/shake/bullet flat suites',
    device:
      'Reduced Motion ON → repeat merges 3/6/12/1536/new-best 12/game-over → board flat, no flash/particles/overshoot/glow/bullet/shake, fade instant',
  },

  // P0 E2E-02: Haptics+sound stay under Reduced Motion (AC2, FR-30, UX-DR-16)
  'E2E-02 haptics+sound stay (P0, FR-30)': {
    priority: 'P0',
    ac: 'AC2 (FR-30, UX-DR-16)',
    risk: 'R-009 (TECH 2)',
    steps: [
      'Given Reduced Motion enabled',
      'When merges 3/6/12/24/768/1536 each resolve (heavy tiers 12+ → haptic heavy)',
      'Then hapticsStyleForValue(3) Light / 6 Medium / 12+ Heavy identical regardless of reducedMotion',
      'And triggerHapticsForTrace still fires per merge entry (from.length===2 && !spawned) — gateway never reads reducedMotion',
      'And reducedPresetFor(12).haptic heavy proves preservation (hapticsStyleForValue unchanged)',
      'And sound still plays (expo-audio SFX, 8-6 contract, not gated — manual ear check)',
      'And haptics.ts code-only grep "reducedMotion" empty (only // FR-30 comment)',
    ],
    hostGate: 'reducedMotion.atdd.test.ts [P0-06][P1-06][P2-03] + gateway.spec.ts [P0] haptics stay',
    device: 'Reduce Motion ON → feel Haptics still: 3 light, 6 medium, 12+ heavy — while visuals flat',
  },

  // P0 E2E-03: Reduced Motion is a preset not a flag (AC3, UX-DR-16, ADR-04)
  'E2E-03 preset-not-flag contract (P0, UX-DR-16, ADR-04)': {
    priority: 'P0',
    ac: 'AC3 (UX-DR-16, ADR-04)',
    risk: 'R-002 (TECH 6)',
    steps: [
      'Given feel system selects Reduced Motion',
      'When reducedPresetFor(value) is called for light 3 / medium 6 / heavy 12+ / non-finite NaN',
      'Then REDUCED_PRESET frozen shakeMs 0 / particleBurst 0 / overshootMs 0 / overshootScale 1 / flash false (single datum, no scatter)',
      'And reducedPresetFor(12) returns fresh copy {...REDUCED_PRESET, haptic: heavy} — not same object, never mutates frozen datum',
      'And presetFor(3)===FEEL_PRESETS[3] identity-stable (memo-safe) while reducedPresetFor is copy path',
      'And punch.ts/shake.ts/bulletTime.ts delegate via reducedPresetFor(value) when reducedMotion===true (no scattered if flag return 0)',
      'And feel.bench sweeps both presetFor + reducedPresetFor + punch*For + shake*For + shouldTrigger/shouldShake — budget median <0.05 / p99 <0.1',
    ],
    hostGate:
      'reducedMotion.atdd.test.ts [P0-01][P0-02][P2-02] + gateway.spec.ts [P0] preset identity vs reduced copy + [P2] datum literal scan',
    device: 'No device leg — pure preset contract; verified via host bench both-profile flat + haptic-preserve loop',
  },

  // P0 E2E-04: Sanctioned 60 FPS fallback + benchmark both profiles (AC4, ADR-04, NFR-14)
  'E2E-04 60 FPS fallback + caps (P0, ADR-04, NFR-14)': {
    priority: 'P0',
    ac: 'AC4 (ADR-04, NFR-14)',
    risk: 'R-007 (PERF 3)',
    steps: [
      'Given reduced preset is the sanctioned 60 FPS emergency fallback (ADR-04)',
      'When both profiles swept by feel.bench.test.ts (10k turns, warmup 1k, allPresetValues() × helpers)',
      'Then median <0.05ms && p99 <0.1ms for both full (baseline 9.6ms total) and reduced (6.5ms total) — frame-budget headroom',
      'And SHAKE_CAP 8 single cap, BULLET_TIME_MS 200 single datum, FADE_MS 280 single literal never exceeded without data change',
      'And no per-merge withSequence stacking beyond single shake 130ms + bullet 200ms + punch 80-120ms per moveResult',
      'And device lane when Epic 8 lands: useFrameRateBaseline after 2-min play with 5+ new-bests while OFF + one heavy co-fire + one Reduce ON flat → p99Ms <16.7',
    ],
    hostGate: 'reducedMotion.atdd.test.ts [P0-09][P2-01] + gateway.spec.ts [P0] caps + [P2] perf micro-bench + node --test benchmarks/feel.bench.test.ts',
    device: 'Device lane: 2-min play 5 new-bests (including heavy bullet+shake co-fire) while OFF + Reduce ON flat — record fps/p99Ms/frames',
  },

  // P1 E2E-05: GameBoard board-only gating — shake/bullet/bursts/AnimatedTile isMerge && !reducedMotion (AC5, UX-DR-27)
  'E2E-05 GameBoard board-only gating (P1, UX-DR-27, R-004)': {
    priority: 'P1',
    ac: 'AC5 (UX-DR-27)',
    risk: 'R-004 (TECH 4), R-005 (TECH 4)',
    steps: [
      'Given GameBoard with reducedMotion prop (App threads settings.reducedMotion to GameBoard + GameOverOverlay)',
      'When moveResult.moved && !reducedMotion && direction → shake via maxShakeForTrace + directionVector (SHAKE_CAP 8)',
      'And moveResult.moved && !reducedMotion && shouldTriggerBulletTime(...,!!reducedMotion) → bulletFlash withSequence(withTiming 0.45 60, BULLET_TIME_MS-60) #fff7e0',
      'And if(!reducedMotion) → particle bursts (16 dots heavy, board-local position:absolute pointerEvents none)',
      'And AnimatedTile isPunch = Boolean(isMerge && !reducedMotion) → overshoot 1.15/1.12/1.08 + flash + glow only when !reduced',
      'Then board Animated.View style={shakeStyle} wraps Canvas only (never chrome), bullet overlay Animated.View position:absolute width×width #fff7e0 sibling — Hud/PreviewCard never inside Animated.View / never receive shakeStyle/bulletFlashStyle/isPunch',
    ],
    hostGate: 'reducedMotion.atdd.test.ts [P1-03][P1-06] + gateway.spec.ts [P1] trace→feel contract + chrome guard',
    device: 'Heavy 12 while OFF → board shakes/flashes, preview card & score flat; Reduce ON → board flat even for 12',
  },

  // P1 E2E-06: GameOverOverlay instant vs 280ms fade + cleanup (AC5, UX-DR-16)
  'E2E-06 GameOverOverlay fade branches (P1, R-003)': {
    priority: 'P1',
    ac: 'AC5 (UX-DR-16)',
    risk: 'R-003 (BUS 6)',
    steps: [
      'Given App.tsx:929 threads reducedMotion={settings.reducedMotion} into GameOverOverlay (was hardcoded false — fixed 0ec7482)',
      'When GameOverOverlay mounts with reducedMotion true → instant scrimOpacity 1 / contentOpacity 1 / contentY 0 via setValue (no Animated.timing)',
      'And with reducedMotion false → Animated.parallel 280ms fade with 80ms delay + easing.out(cubic) + cleanup stopAnimation',
      'And useRef(new Animated.Value(reducedMotion?1:0)) prevents first-frame flash (1→0 snap vs 0→12)',
      'Then App wiring grep reducedMotion={settings.reducedMotion} hits >=2 sites (GameBoard + GameOverOverlay) and zero reducedMotion={false} literals',
      'And storage/schema.ts DEFAULT reducedMotion false — fresh install → full feel',
    ],
    hostGate: 'reducedMotion.atdd.test.ts [P1-04][P1-02] + gateway.spec.ts [P1] App wiring',
    device: 'Game over with Reduce ON → overlay appears instantly (no 280ms fade); OFF → soft fade visible (both lanes + accelerated)',
  },

  // P1 E2E-07: Mid-animation snap false→true withTiming(0,20) for shake/bullet (AC5, R-006)
  'E2E-07 mid-flight snap (P1, R-006)': {
    priority: 'P1',
    ac: 'AC5 (FR-30 mid-snap)',
    risk: 'R-006 (TECH 4)',
    steps: [
      'Given in-flight shake withSequence 30+40+30+30=130ms + bullet withSequence 60+140=200ms + GameOver 280ms fade',
      'When reducedMotion false→true mid-flight (Settings toggle during shake/bullet)',
      'Then GameBoard useEffect([reducedMotion]) snaps shakeX/Y + bulletFlash withTiming(0, {duration:20}) — board flat within one frame',
      'And GameOverOverlay snaps scrim/content to 1/0 via setValue + stops timing',
      'And helpers shouldTriggerBulletTime(...,true) false even for heavy tiers, maxShakeForTrace(...,true) 0',
      'And EARLY_INPUT_MS≈84ms gate may re-open before snap completes — second merge must not resurrect pre-snap offset',
    ],
    hostGate: 'reducedMotion.atdd.test.ts [P1-05] snap + gateway.spec.ts [P1] trace→feel umbrella',
    device: 'Start shake/bullet on 12 new-best then toggle Reduce ON mid-animation → board snaps flat within one frame (video)',
  },

  // P1 E2E-08: Device smoke integrated journey — portrait+landscape, airplane, NOOP, all combs (P1-07 in test-design)
  'E2E-08 device smoke integrated (P1, P1-07 smoke)': {
    priority: 'P1',
    level: 'E2E (device manual, ~15 min)',
    ac: 'All ACs (integrated)',
    risk: 'R-001, R-003, R-004, R-005, R-006',
    steps: [
      'Given portrait+landscape (both pistes) + in-app Settings reducedMotion toggle + board 60/40 pipelines',
      'When (Reduced OFF) merge 6 subtle shake2 → 12 heavy shake5+flash/particles+overshoot1.15 → 1536 glow → new-best 12 ~200ms bullet #fff7e0 → game over soft fade280 → all full feel',
      'And toggle Reduce ON → repeat each: board stays flat, no shake/flash/particles/overshoot/glow/bullet, game-over instant, haptics Heavy feelable + sound plays, Hud preview card & score never flash/shake even when board does, NOOP → no feel, AIRPLANE → same offline, mid-shake toggle → snap',
      'Then exit-criteria smoke is PASS — sign-off checkbox in PR description (device reduced-motion smoke: 6/12/1536 + bullet + game-over 280→instant + chrome + mid-flight snap + haptics stay + NOOP + portrait/landscape)',
    ],
    hostGate: 'All host P0/P1 GREEN + gateway.spec.ts [P1] real trace + P0 umbrella; device is the only remaining automatable gap (Reanimated worklets + Taptic + Skia Canvas choreography)',
    device: 'Real iPhone dev build — one run covers E2E-01..07; video side-by-side heavy vs Hud proves chrome guard',
  },

  // P2 E2E-09: Overlapping shake/bullet without cancelAnimation (EXPECTED RED — R-006 mid-flight)
  'E2E-09 overlapping truncation without cancelAnimation (P2, EXPECTED RED)': {
    priority: 'P2',
    ac: 'AC5 edge (R-006)',
    risk: 'R-006 (TECH 4, deferred) — same as 8-3 R-001 / 8-4 R-007 overlap class',
    status: 'EXPECTED RED — requires cancelAnimation(bulletFlash/shakeX/Y) before new withSequence',
    steps: [
      'Given two rapid new-bests <200ms apart (EARLY_INPUT_MS 84 re-opens gate before 200ms bullet / 130ms shake completes)',
      'When second withSequence overwrites first mid-flight without cancelAnimation',
      'Then first flash/shake truncated (last wins, not queued) — visible but not freeze; fix is one-line cancelAnimation import + call',
      'And bursts use bare setTimeout 500ms auto-clear without ref tracking — orphan on unmount (deferred R-010)',
    ],
    hostGate: 'reducedMotion.atdd.test.ts [P2-04] hasCancel check — currently RED until fixed; gateway.spec still GREEN',
    device: 'On device, rapid 6→12 within ~90ms (EARLY_INPUT window) shows second 200ms flash + 130ms shake start clean only after cancelAnimation fix',
  },

  // P2 E2E-10: Board edge clipping product decision (P2 deferred low)
  'E2E-10 board edge clipping product decision (P2, deferred low)': {
    priority: 'P2',
    ac: 'AC5 edge (P2-06)',
    risk: 'R-008 low (chrome edge, deferred)',
    status: 'GREEN — documents product decision (overflow hidden vs bleed margin)',
    steps: [
      'Given board container width×width with Animated.View shakeStyle transform translateX/Y capped 8',
      'When heavy shake 5/8 at board edge (especially 5-8px near border)',
      'Then may clip at parent View edges — product decision is overflow hidden vs bleed margin (not gate-blocking)',
      'And shakeStyle is board-only already (not chrome) — gate is that shakeStyle wraps Canvas only, not that clipping is fixed',
    ],
    hostGate: 'reducedMotion.atdd.test.ts [P2-06] width×width + shakeStyle board-only — GREEN',
  },
} as const;

// For TEA traceability: priority counts for this E2E artifact
export const PRIORITY_COVERAGE = { P0: 4, P1: 4, P2: 2, P3: 0 } as const;
export const TEST_COUNT = 10;

// TEA checklist alignment:
// - P0 E2E tracks FR-30 umbrella (full layer flat), haptics stay, preset-not-flag, caps/60fps fallback — blocks merge.
// - P1 E2E tracks board-only gating + GameOver wiring + mid-flight snap + integrated device smoke — pre-merge device gate.
// - P2 E2E tracks overlapping truncation + edge clipping — deferred lows, not S0/S1 (waived with owner+date if not fixed).
