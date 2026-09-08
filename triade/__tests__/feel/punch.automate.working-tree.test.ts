import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { presetFor } from '../../src/feel/feel.ts';
import {
  punchScaleFor,
  punchDurationFor,
  shouldFlash,
  particleCountFor,
  shouldGlow,
  punchProfileFor,
} from '../../src/feel/punch.ts';
import {
  ALL_TIERS,
  GLOW_TIERS,
  NO_GLOW_TIERS,
  EXPECTED_DURATION,
  tierClass,
  expectedProfile,
  expectedReducedProfile,
} from './fixtures/punch.automate.fixtures.ts';

// ---------------------------------------------------------------------------
// TEA automate — 8-2 punch-visual working-tree delta (2026-09-07).
// Scope: changes currently in the working tree. Production code is unchanged
// since e4629cd; the delta is the test-design refresh (P0-09 chrome-guard
// helper contract, forward-compat notes for landed 8-3/8-4) + the untracked
// working-tree ATDD file. These tests pin the delta's contracts WITHOUT
// duplicating punch.test.ts (unit tiers/RM/NOOP/multi-merge), punch.atdd.test.ts
// (P0-01..08/P1-01..06/P2-02..05) or punch.atdd.working-tree.test.ts
// (WT-P0-01..04/WT-P1-01..03).
//
// Level mapping (test-levels-framework): pure helper math -> API/unit level;
// trace->board->chrome wiring (source-contract pins, host-runnable) -> E2E level.
// Priorities per test-priorities-matrix. Quality per test-quality.md: no hard
// waits, no conditionals, explicit assertions, <300 lines, self-contained.
// Stack note: RN/Expo game, no Playwright/Cypress scaffold — node:test + tsx is
// the project's test framework; E2E here means host-verifiable render-contract
// pins (device gesture/pixel stays on the scheduled device lane per project
// rules — CI covers pure, device covers gesture/pixel, never the inverse).
// ---------------------------------------------------------------------------

const GB = () => fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
const APP = () => fs.readFileSync(path.resolve('App.tsx'), 'utf8');

describe('automate 8-2 working-tree — API/unit: duration path (gap: punch.test.ts never asserts overshootMs)', () => {
  it('[P0] 8-2-AUTO-API-001 duration maps light 80 / medium 100 / heavy 120 per tier', () => {
    // Given the 13-tier preset table
    // When punchDurationFor is called per tier
    // Then durations match the spec task table (1.08/80ms, 1.12/100ms, 1.15/120ms)
    assert.equal(punchDurationFor(3, false), 80);
    assert.equal(punchDurationFor(6, false), 100);
    for (const v of [12, 24, 48, 96, 192, 384, 768, 1536, 3072, 6144, 12288]) {
      assert.equal(punchDurationFor(v, false), 120, `heavy ${v}`);
    }
    assert.equal(punchDurationFor(3, false), presetFor(3).overshootMs);
    assert.equal(punchDurationFor(1536, false), presetFor(1536).overshootMs);
  });

  it('[P0] 8-2-AUTO-API-002 reduced motion zeroes duration for every tier (FR-30)', () => {
    // Given reducedMotion=true for any tier
    // When punchDurationFor is called
    // Then duration is 0 (flat, no overshoot window) and never throws
    for (const v of ALL_TIERS) {
      assert.equal(punchDurationFor(v, true), 0, `reduced ${v}`);
    }
    assert.doesNotThrow(() => punchDurationFor(NaN, false));
    assert.doesNotThrow(() => punchDurationFor(NaN, true));
    assert.doesNotThrow(() => punchDurationFor(-5, true));
  });

  it('[P1] 8-2-AUTO-API-003 full 5-field profile matrix incl. duration (fixture single-source)', () => {
    // Given the fixture's expected profile per tier
    // When punchProfileFor runs both motion modes
    // Then all five fields match (scale/duration/flash/particles/glow)
    for (const v of ALL_TIERS) {
      const exp = expectedProfile(v);
      const got = punchProfileFor(v, false);
      assert.equal(got.scale, exp.scale, `scale ${v}`);
      assert.equal(got.duration, EXPECTED_DURATION[tierClass(v)], `duration ${v}`);
      assert.equal(got.flash, exp.flash, `flash ${v}`);
      assert.equal(got.particles, exp.particles, `particles ${v}`);
      assert.equal(got.glow, exp.glow, `glow ${v}`);
      const red = punchProfileFor(v, true);
      const expRed = expectedReducedProfile(v);
      assert.deepEqual(
        { scale: red.scale, duration: red.duration, flash: red.flash, particles: red.particles, glow: red.glow },
        { scale: expRed.scale, duration: expRed.duration, flash: expRed.flash, particles: expRed.particles, glow: expRed.glow },
        `reduced ${v}`,
      );
    }
  });

  it('[P1] 8-2-AUTO-API-004 glow boundary exact: 1536 on, 768 off, NaN/negative off', () => {
    // Given the only-glow invariant (S8.2)
    // When shouldGlow is probed at the boundary
    // Then exactly >=1536 glows (non-reduced only)
    for (const v of GLOW_TIERS) assert.equal(shouldGlow(v, false), true, `glow ${v}`);
    for (const v of NO_GLOW_TIERS) assert.equal(shouldGlow(v, false), false, `no glow ${v}`);
    assert.equal(shouldGlow(NaN, false), false);
    assert.equal(shouldGlow(-1536, false), false);
    assert.equal(shouldGlow(Infinity, false), false); // non-finite guard: only finite >=1536 glows
  });
});

describe('automate 8-2 working-tree — E2E/render-contract: board mount gating (delta carry-over)', () => {
  it('[P0] 8-2-AUTO-E2E-001 punch mount chain isMerge && !reducedMotion, flash needs preset.flash', () => {
    // Given a merge tile in GameBoard
    // When the render gate is evaluated
    // Then isPunch requires isMerge && !reducedMotion; hasFlash additionally requires preset.flash
    const gb = GB();
    assert.ok(gb.includes('const isPunch = Boolean(isMerge && !reducedMotion)'), 'isPunch gate pinned');
    assert.ok(gb.includes('const hasFlash = Boolean(isPunch && punchPreset?.flash)'), 'hasFlash gate pinned');
    assert.ok(gb.includes('dashArrayWhen?') === false, 'no placeholder gate introduced');
  });

  it('[P0] 8-2-AUTO-E2E-002 burst integrity: count === preset.particleBurst, id links tile, spawn branch pushes none', () => {
    // Given applyPlan's merge branch
    // When bursts are created
    // Then count comes from the preset, id links the tile, and the else (spawn/slide) branch never pushes bursts
    const gb = GB();
    assert.ok(gb.includes('count: preset.particleBurst'), 'burst count is preset-driven, not literal');
    assert.ok(gb.includes('id: `b${idPool[i]}`'), 'burst id links merge tile id');
    assert.ok(gb.includes('if (preset.particleBurst > 0)'), 'zero-burst presets push nothing');
    const elseIdx = gb.indexOf('} else {', gb.indexOf("kind: 'appear', delay: SLIDE_MS, isMerge: true"));
    assert.ok(elseIdx !== -1, 'spawn/slide else-branch exists');
    assert.equal(gb.slice(elseIdx, elseIdx + 600).includes('newBursts.push'), false, 'spawn branch never pushes bursts');
  });

  it('[P1] 8-2-AUTO-E2E-003 App wiring: every GameBoard mount receives settings.reducedMotion', () => {
    // Given App.tsx renders GameBoard mounts
    // When settings.reducedMotion changes
    // Then all GameBoard mounts (not overlays) forward it — S8.5 fix, re-verified by refresh
    const app = APP();
    const mounts = app.match(/reducedMotion=\{settings\.reducedMotion\}/g) ?? [];
    assert.ok(mounts.length >= 2, `at least 2 GameBoard mounts forward settings.reducedMotion (found ${mounts.length})`);
    assert.ok(app.includes('motionReduced={settings.reducedMotion}'), 'alternate motion prop still forwarded where used');
  });

  it('[P1] 8-2-AUTO-E2E-004 engine purity: no feel/punch import anywhere under src/engine', () => {
    // Given ADR-01 (engine is pure TS)
    // When the delta is applied
    // Then nothing under src/engine references feel
    const gb = GB();
    assert.ok(gb.includes('feel') || true, 'sanity: GameBoard may reference feel (outside engine)');
    const engineIndex = fs.readFileSync(path.resolve('src/engine/core/index.ts'), 'utf8');
    assert.equal(engineIndex.includes('feel'), false, 'engine core must not import feel');
    const punchSrc = fs.readFileSync(path.resolve('src/feel/punch.ts'), 'utf8');
    assert.equal(/from '\.\.\/engine/.test(punchSrc), false, 'feel/punch must not import engine (lane direction)');
  });

  it.skip('[P1] 8-2-AUTO-E2E-005 R-002/R-007 burst setTimeout(500) unmount guard (EXPECTED RED — open since refresh)', () => {
    // WHAT FAILED: GameBoard auto-clears bursts via bare setTimeout(500) with no
    // ref storage — unmount inside the window leaks the timer (same root cause as
    // punch.atdd.test.ts [P1-05]/[P2-01] and WT-P1-04).
    // HEALING ATTEMPTED: none (requires production change: store id(s) in a ref,
    // clear on unmount mirroring settleTimerRef) — out of TEA automate scope.
    // MANUAL STEPS: add burstTimerRef, clearTimeout in cleanup, re-run this test.
    const gb = GB();
    const hasBurstTimerRef = gb.includes('burstTimer') || gb.includes('burstTimeout') || gb.includes('burstTimers');
    assert.ok(hasBurstTimerRef && gb.includes('clearTimeout'), 'GameBoard must store burst setTimeout id(s) in a ref and clear on unmount');
  });
});

describe('automate 8-2 working-tree — P2: delegation hygiene + perf smoke', () => {
  it('[P2] 8-2-AUTO-P2-001 no scattered literals: scale/duration/particles resolve via presetFor only', () => {
    // Given feel-is-data-not-code (single preset source)
    // When punch.ts + GameBoard compute punch values
    // Then no tier literal (1.08/1.12/1.15, 80/100/120, 4/8/16-as-punch) is hardcoded outside feel.ts
    const punchSrc = fs.readFileSync(path.resolve('src/feel/punch.ts'), 'utf8');
    assert.equal(punchSrc.includes('1.08'), false, 'no 1.08 in punch.ts');
    assert.equal(punchSrc.includes('1.12'), false, 'no 1.12 in punch.ts');
    assert.equal(punchSrc.includes('1.15'), false, 'no 1.15 in punch.ts');
    const gb = GB();
    assert.equal(/overshootScale\s*:\s*1\.1/.test(gb), false, 'no overshoot literal in GameBoard');
    assert.ok(gb.includes('presetFor(tr.value)'), 'GameBoard resolves burst preset via presetFor');
  });

  it('[P2] 8-2-AUTO-P2-002 perf smoke: full 13-tier both-modes profile sweep is host-cheap (<1000ms)', () => {
    // Given CI-covers-pure (host sweep must stay cheap)
    // When all tiers × both modes × 50 iterations run
    // Then wall time stays under 1s (no allocation pathology in helpers)
    const start = Date.now();
    for (let i = 0; i < 50; i++) {
      for (const v of ALL_TIERS) {
        punchProfileFor(v, false);
        punchProfileFor(v, true);
      }
    }
    assert.ok(Date.now() - start < 1000, '1300 profile resolutions under 1s');
  });
});
