/**
 * TEA Automate — E2E Flash Overlay Tests for 8-4 Bullet Time
 * Location: _bmad-output/test-artifacts/tests/e2e/bulletTime.flash.spec.ts
 * Runner: Manual device smoke (real iPhone dev build, Expo 57, Reanimated 4 + Skia 2.6.2)
 * TEA mapping: "E2E" = device Skia/Reanimated verification (no Playwright page.goto for RN).
 * This file documents the E2E journey as Playwright-style specs for traceability,
 * but execution is manual per test-design P1-07. Host automation covers all
 * automatable surfaces; only worklet timing + Taptic feel remain device-only.
 *
 * Each test below maps to an ATDD source-structure gate in
 * triade/__tests__/feel/bulletTime.atdd.test.ts (P1-03..P1-06, P2-01, P2-05) plus the
 * exit-criteria device smoke checklist (test-design-epic-8-4-bullet-time.md).
 *
 * To run host gates that back these E2E journeys:
 *   cd triade && npm test -- __tests__/feel/bulletTime.atdd.test.ts --test-name-pattern "P1-0[3-6]"
 *
 * Device smoke (15 min, portrait+landscape, real iPhone):
 *   1. Build dev: npx expo run:ios
 *   2. Toggle iOS Settings → Accessibility → Motion → Reduce Motion OFF/ON
 *   3. Execute journey below, observe #fff7e0 board-only flash ~200ms (60 in + 140 out)
 */

// This file is intentionally NOT executed via `npm test` — it is a TEA E2E artifact
// under test_artifacts/tests/e2e per _bmad/tea/config.yaml. Importing it would fail
// without a device. Host gates live in bulletTime.atdd.test.ts.

export const E2E_JOURNEYS = {
  // P1 E2E-01: First merge rarity + flash overlay board-only (AC1, AC6, UX-DR-27)
  'E2E-01 first-merge board-only flash': {
    priority: 'P1',
    level: 'E2E (device manual)',
    ac: 'AC1 + AC6',
    risk: 'R-003, R-004',
    steps: [
      'Given fresh session (sessionBestMerge 0, Reduced Motion OFF)',
      'When swipe merges 1+2→3 (first merge, max 3 > 0)',
      'Then board flashes #fff7e0 ~200ms (60ms to 0.45 opacity + 140ms to 0) via BULLET_TIME_MS-60 overlay',
      'And Hud preview card + score never flash (Animated.View board-only, sibling of Canvas wrapper, pointerEvents none)',
      'And haptics fire light for 3 (not gated here)',
    ],
    hostGate: 'bulletTime.atdd.test.ts [P1-03] GameBoard imports BULLET_TIME_MS, uses BULLET_TIME_MS-60, #fff7e0 absolute overlay',
    device: 'Real iPhone portrait: 1+2→3 → board flash visible, preview card flat',
  },

  // P1 E2E-02: Rarity sequence 0→3 flash, 3→no flash when best 6, 6→flash, 12→flash (AC1, AC2)
  'E2E-02 rarity sequence': {
    priority: 'P1',
    ac: 'AC1, AC2, AC5',
    risk: 'R-003, R-007',
    steps: [
      'Given sessionBest 0 → merge 3 → flash + best becomes 3',
      'When next merge 3 with best 6 (ordinary) → no flash, best stays 6',
      'When merge 6 with best 3 → flash, best becomes 6',
      'When merge 6 again with best 6 → no flash',
      'When merge 12 with best 6 → flash (max wins single 200ms, not per-merge stacked)',
      'When trace has [3,12] with best 6 → single flash for max 12, nextBest 12',
    ],
    hostGate: 'bulletTime.atdd.test.ts [P0-05][P0-09] multiple max wins + rarity sequence; [P1-01] real engine trace',
  },

  // P1 E2E-03: Reduced Motion ON suppresses flash while haptics+sessionBest stay (FR-30)
  'E2E-03 Reduced Motion FR-30': {
    priority: 'P0',
    ac: 'AC3 (FR-30, UX-DR-16)',
    risk: 'R-001',
    steps: [
      'Given iOS Settings → Reduce Motion ON (or in-app settings.reducedMotion true)',
      'When new-best merges 3/6/12/24 each resolve',
      'Then board never flashes (shouldTriggerBulletTime(..., true)===false even for 12)',
      'And bulletFlash snaps withTiming(0,20) even mid-200ms animation (useEffect([reducedMotion]))',
      'And nextSessionBest still advances (12 vs 6 →12) — future non-reduced merges can still trigger',
      'And haptics stay (reducedPresetFor(12).haptic heavy, 3 light) — not gated',
    ],
    hostGate: 'bulletTime.atdd.test.ts [P0-04] Reduced Motion gate + [P1-04] mid-flight snap',
    device: 'Reduce Motion ON → repeat 3/6/12 new-bests → flat overlay while haptics felt',
  },

  // P1 E2E-04: NOOP / slide-only / spawn-only never flashes (AC4)
  'E2E-04 NOOP silent': {
    priority: 'P1',
    ac: 'AC4',
    risk: 'R-005',
    steps: [
      'Given board with no merge (slide-only from.length===1 or NOOP moved:false or spawn-only spawned:true)',
      'When swipe resolves with maxMergeValue null',
      'Then no flash, never throws (GameBoard try/catch + shouldTrigger false)',
      'And nextSessionBest unchanged',
    ],
    hostGate: 'bulletTime.atdd.test.ts [P0-06] NOOP / no-merge silent',
    device: 'NOOP swipe (no merge) → no yellow flash',
  },

  // P1 E2E-05: Undo rewind restores sessionBestMerge so same value re-triggers (ADR-06)
  'E2E-05 undo rewind Snapshot': {
    priority: 'P1',
    ac: 'AC5 (ADR-06, UX-DR-28)',
    risk: 'R-002',
    steps: [
      'Given sessionBest 0→3→6→12 (each new-best flashed)',
      'When undo pops Snapshot with sessionBestMerge 6 (7 Number.isFinite guards in App.tsx)',
      'Then same 12 re-triggers (isNewSessionBest([12],6) true)',
      'And Snapshot includes sessionBestMerge? optional, old history without field falls back to 0 via Number.isFinite guard',
      'And functional setSessionBestMerge(prev=>nextSessionBest(trace,prev)) avoids EARLY_INPUT_MS 84ms stale closure',
    ],
    hostGate: 'bulletTime.atdd.test.ts [P0-08] undo chain + [P1-02] App Snapshot 7 guards + functional update',
    device: 'After 12 best, undo → redo same 12 → re-flashes yellow',
  },

  // P1 E2E-06: Chrome guard—board only, never preview/score, width×width #fff7e0 (AC6)
  'E2E-06 chrome guard': {
    priority: 'P1',
    ac: 'AC6 (UX-DR-27)',
    risk: 'R-004',
    steps: [
      'Given board Canvas wrapped in Animated.View shakeStyle',
      'When bulletFlashStyle Animated.View overlay renders position:absolute width×width borderRadius 14',
      'Then overlay is sibling of shake wrapper, not ancestor of Hud/PreviewCard — chrome never flashes',
      'And overlay pointerEvents none, color #fff7e0, opacity 0.45→0 via withSequence(withTiming 60, BULLET_TIME_MS-60)',
    ],
    hostGate: 'bulletTime.atdd.test.ts [P1-03][P1-05] chrome guard — GameBoard does not import PreviewCard/Hud',
    device: 'Heavy 12 flash side-by-side video: board flashes, preview card flat',
  },

  // P2 E2E-07: Overlapping bullet truncation (R-007 deferred) — EXPECTED RED
  'E2E-07 overlapping truncation (EXPECTED RED)': {
    priority: 'P2',
    ac: 'AC5 edge',
    risk: 'R-007 (deferred low)',
    status: 'EXPECTED RED — requires cancelAnimation(bulletFlash) before new withSequence',
    steps: [
      'Given two rapid new-bests <200ms apart (EARLY_INPUT_MS 84 re-opens gate before 200ms bullet completes)',
      'When second withSequence overwrites first mid-flight without cancelAnimation',
      'Then first flash truncated (last wins, not queued) — visible but not freeze; fix is one-line cancelAnimation',
    ],
    hostGate: 'bulletTime.atdd.test.ts [P2-01] hasCancel check — currently RED until fixed',
  },

  // P2 E2E-08: Width/overflow clipping (R-010 deferred) — EXPECTED RED
  'E2E-08 width overflow (EXPECTED RED)': {
    priority: 'P2',
    ac: 'AC6 edge',
    risk: 'R-010 (deferred low)',
    status: 'EXPECTED RED — product decision: Math.max(width,1) guard vs accepted',
    steps: [
      'Given GameBoard overlay width/height=width flows from parent boardWrap width without Math.max guard',
      'When width NaN (degenerate, not reachable via finite layoutFor)',
      'Then RN warning but not crash; overlay clipped by boardWrap overflow hidden by design',
    ],
    hostGate: 'bulletTime.atdd.test.ts [P2-05] hasWidthGuard check — currently RED until product decides',
  },
} as const;

// For TEA traceability: priority counts for this E2E artifact
export const PRIORITY_COVERAGE = { P0: 1, P1: 5, P2: 2, P3: 0 } as const;
export const TEST_COUNT = 8;
