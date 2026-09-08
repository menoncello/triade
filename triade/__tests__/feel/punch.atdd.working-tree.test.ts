import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { presetFor, reducedPresetFor, allPresetValues } from '../../src/feel/feel.ts';
import {
  punchScaleFor,
  punchDurationFor,
  shouldFlash,
  particleCountFor,
  shouldGlow,
  punchProfileFor,
} from '../../src/feel/punch.ts';

// ---------------------------------------------------------------------------
// ATDD 8-2 working-tree delta (2026-09-07 refresh) — red-phase acceptance
// scaffolds covering the changes currently in the working tree.
//
// Working tree at run time is metadata-only: the test-design refresh for
// 8-2 (P0-09 chrome-guard helper contract added, forward-compat notes for
// landed 8-3/8-4 sharing the GameBoard main-thread budget, verification
// 1034 pass / 0 fail). Production code (feel.ts / punch.ts / GameBoard.tsx /
// App.tsx) is unchanged since e4629cd, so P0/P1 pins below are GREEN on the
// current tree and turn RED if the delta is removed. Residual risks R-002 /
// R-007 (burst setTimeout(500) with no unmount guard) plus the open
// composite p99 re-measurement are encoded as EXPECTED RED (it.skip) so the
// full suite stays green while the gaps stay visible.
//
// Host-only: node:test + tsx, no RN/native, no Skia/Reanimated import.
// ---------------------------------------------------------------------------

describe('ATDD 8-2 working-tree delta — P0 pins (spec I/O matrix still holds)', () => {
  it('[WT-P0-01] tiers 3/6/12+ still map light/medium/heavy (1.08/1.12/1.15)', () => {
    assert.equal(presetFor(3).overshootScale, 1.08);
    assert.equal(presetFor(6).overshootScale, 1.12);
    for (const v of [12, 24, 1536, 3072, 12288]) {
      assert.equal(presetFor(v).overshootScale, 1.15, `heavy ${v}`);
      assert.equal(presetFor(v).flash, true, `heavy ${v} flash`);
      assert.equal(presetFor(v).particleBurst, 16, `heavy ${v} burst`);
    }
    assert.equal(punchScaleFor(3, false), 1.08);
    assert.equal(punchScaleFor(6, false), 1.12);
    assert.equal(punchScaleFor(12, false), 1.15);
  });

  it('[WT-P0-02] glow only for 1536+ and suppressed under Reduced Motion', () => {
    assert.equal(shouldGlow(768, false), false);
    assert.equal(shouldGlow(1536, false), true);
    assert.equal(shouldGlow(3072, false), true);
    for (const v of [3, 6, 12, 1536, 3072]) {
      assert.equal(shouldGlow(v, true), false, `reduced ${v}`);
      assert.equal(punchScaleFor(v, true), 1, `reduced scale ${v}`);
      assert.equal(particleCountFor(v, true), 0, `reduced particles ${v}`);
      assert.equal(shouldFlash(v, true), false, `reduced flash ${v}`);
    }
    assert.equal(reducedPresetFor(12).haptic, 'heavy');
  });

  it('[WT-P0-03] P0-09 chrome-guard helper contract (new in refresh): light fallback data, board gate owns chrome rule', () => {
    // Helper is pure data: spawn values 1/2 fall back to light tier data…
    assert.equal(punchScaleFor(1, false), 1.08);
    assert.equal(punchScaleFor(2, false), 1.08);
    // …but the chrome rule lives in the board gate, not the helper:
    // isMerge:true is set only inside the merge branch, never for spawns.
    const gb = fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
    const mergeSetsIsMerge = /tr\.type\s*===\s*'merge'[\s\S]{0,800}isMerge:\s*true/.test(gb);
    assert.ok(mergeSetsIsMerge, 'isMerge:true only inside merge branch');
    const spawnIdx = gb.indexOf("tr.type === 'spawn'");
    assert.ok(spawnIdx !== -1, 'spawn branch exists');
    assert.equal(gb.slice(spawnIdx, spawnIdx + 400).includes('isMerge'), false, 'spawn branch never sets isMerge');
    assert.ok(gb.includes('isMerge && !reducedMotion'), 'punch gated on isMerge && !reducedMotion');
  });

  it('[WT-P0-04] data-not-code: all tiers finite, scale within 1..1.2, punch.ts delegates', () => {
    for (const v of allPresetValues()) {
      const p = punchProfileFor(v, false);
      assert.ok(Number.isFinite(p.scale) && p.scale >= 1 && p.scale <= 1.2, `scale ${v}`);
    }
    const punchSrc = fs.readFileSync(path.resolve('src/feel/punch.ts'), 'utf8');
    assert.ok(punchSrc.includes('presetFor'), 'punch.ts delegates to presetFor');
    assert.equal(punchSrc.includes('1.08'), false, 'no hardcoded 1.08 in punch.ts');
  });
});

describe('ATDD 8-2 working-tree delta — P1 wiring (refresh re-verified)', () => {
  it('[WT-P1-01] App wiring passes settings.reducedMotion (S8.5 fix present)', () => {
    const app = fs.readFileSync(path.resolve('App.tsx'), 'utf8');
    assert.ok(app.includes('reducedMotion={settings.reducedMotion}'), 'App passes settings.reducedMotion');
    assert.ok(
      !(app.includes('GameOverOverlay') && /GameOverOverlay[^]*reducedMotion=\{false\}/.test(app)),
      'GameOverOverlay must not hardcode reducedMotion={false}',
    );
    const gb = fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
    assert.ok(gb.includes('if (!reducedMotion)'), 'burst creation gated by !reducedMotion');
  });

  it('[WT-P1-02] only-glow invariant still holds (single #ff8c2f inside hasGlow)', () => {
    const gb = fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
    assert.equal((gb.match(/#ff8c2f/g) ?? []).length, 1, 'exactly one incandescent glow');
    assert.ok(gb.includes('hasGlow ? (') && gb.includes('#ff8c2f'), 'glow inside hasGlow branch');
  });

  it('[WT-P1-03] engine untouched by delta (no feel import in engine)', () => {
    const engineIndex = fs.readFileSync(path.resolve('src/engine/core/index.ts'), 'utf8');
    assert.equal(engineIndex.includes('from') && engineIndex.includes('feel'), false, 'engine must not import feel');
  });

  it.skip('[WT-P1-04] R-002/R-007 burst timer unmount guard (EXPECTED RED — carry-over from refresh)', () => {
    // GameBoard auto-clears bursts via bare setTimeout(500) with no ref storage.
    // Expected: burst timer id(s) stored in a ref and cleared on unmount
    // (mirroring settleTimerRef). Currently RED — same root cause as
    // punch.atdd.test.ts [P1-05]/[P2-01].
    const gb = fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
    const hasBurstTimerRef = gb.includes('burstTimer') || gb.includes('burstTimeout') || gb.includes('burstTimers');
    assert.ok(hasBurstTimerRef && gb.includes('clearTimeout'), 'GameBoard must store burst setTimeout id(s) in a ref and clear on unmount');
  });

  it.skip('[WT-P2-01] composite p99 re-measurement with 8-3/8-4 (EXPECTED RED — open since refresh)', () => {
    // The refresh notes 8-3 (shake) + 8-4 (bullet) now share the GameBoard
    // main-thread budget with punch; device p99 <16.7ms must be re-measured
    // for the composite. No baseline file exists yet, so this is RED until
    // the Epic-level nightly lane records punch+shake+bullet together.
    const baseline = path.resolve('../..', '_bmad-output/test-artifacts/perf-baseline-punch-shake-bullet.json');
    assert.ok(fs.existsSync(baseline), 'composite perf baseline punch+shake+bullet must exist (Epic nightly lane)');
  });
});
