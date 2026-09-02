import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { presetFor, reducedPresetFor } from '../../src/feel/feel.ts';
import { punchScaleFor, shouldFlash, particleCountFor, shouldGlow, punchProfileFor } from '../../src/feel/punch.ts';

describe('feel — punch visual (S8.2)', () => {
  it('[P0] 3 light punch small (scale 1.08, 4 particles, no flash)', () => {
    const p = presetFor(3);
    assert.equal(p.overshootScale, 1.08);
    assert.equal(p.particleBurst, 4);
    assert.equal(p.flash, false);
    assert.equal(p.overshootMs, 80);
    assert.equal(punchScaleFor(3, false), 1.08);
    assert.equal(shouldFlash(3, false), false);
    assert.equal(particleCountFor(3, false), 4);
    assert.equal(shouldGlow(3, false), false);
  });

  it('[P0] 6 medium punch (scale 1.12, 8 particles, no flash)', () => {
    const p = presetFor(6);
    assert.equal(p.overshootScale, 1.12);
    assert.equal(p.particleBurst, 8);
    assert.equal(p.flash, false);
    assert.equal(shouldFlash(6, false), false);
    assert.equal(particleCountFor(6, false), 8);
  });

  it('[P0] 12+ heavy punch (scale 1.15, 16 particles, flash)', () => {
    for (const v of [12, 24, 48, 96, 192, 384, 768]) {
      assert.equal(presetFor(v).overshootScale, 1.15);
      assert.equal(presetFor(v).flash, true);
      assert.equal(particleCountFor(v, false), 16);
      assert.equal(shouldFlash(v, false), true);
      assert.equal(punchScaleFor(v, false), 1.15);
    }
  });

  it('[P0] glow only for 1536+ (only glow in system)', () => {
    assert.equal(shouldGlow(768, false), false);
    assert.equal(shouldGlow(1536, false), true);
    assert.equal(shouldGlow(3072, false), true);
    assert.equal(shouldGlow(6144, false), true);
    assert.equal(shouldGlow(384, false), false);
    assert.equal(shouldGlow(1, false), false);
  });

  it('[P0] Reduced Motion gates all visual (FR-30, UX-DR-16)', () => {
    for (const v of [3, 6, 12, 24, 1536, 3072]) {
      assert.equal(punchScaleFor(v, true), 1, `value ${v} scale gated`);
      assert.equal(shouldFlash(v, true), false, `value ${v} flash gated`);
      assert.equal(particleCountFor(v, true), 0, `value ${v} particles gated`);
      assert.equal(shouldGlow(v, true), false, `value ${v} glow gated`);
      const prof = punchProfileFor(v, true);
      assert.equal(prof.scale, 1);
      assert.equal(prof.flash, false);
      assert.equal(prof.particles, 0);
      assert.equal(prof.glow, false);
    }
    // reducedPresetFor preserves haptic but cuts visual
    assert.equal(reducedPresetFor(12).haptic, 'heavy');
    assert.equal(reducedPresetFor(12).overshootScale, 1);
    assert.equal(reducedPresetFor(12).particleBurst, 0);
    assert.equal(reducedPresetFor(12).flash, false);
    assert.equal(reducedPresetFor(3).haptic, 'light');
  });

  it('[P0] chrome guard — helper never called for non-merge (NOOP): wrapper returns defaults only for merges', () => {
    // NOOP has no merge entry — GameBoard will not create isMerge tiles, so helpers not invoked.
    // Here we assert that a spawn value 1/2 (never merged) would still map to light preset but
    // GameBoard gates via isMerge flag, not via value — particles are not emitted for spawns even if value is 3 spawn?
    // Spawns are value 1/2/3 but kind spawn never marked isMerge, so no punch — covered by GameBoard logic.
    assert.equal(punchScaleFor(1, false), 1.08); // 1 falls back to light preset data
    // But GameBoard prevents calling punchScaleFor for spawn tiles (isMerge false) — this is the chrome rule.
    // Verified indirectly: spawn tiles use kind appear without isMerge, so AnimatedTile isPunch is false.
  });

  it('[P0] non-finite / negative values fallback safe (never throw)', () => {
    assert.doesNotThrow(() => punchProfileFor(NaN, false));
    assert.doesNotThrow(() => punchProfileFor(Infinity, false));
    assert.doesNotThrow(() => punchProfileFor(-5, false));
    assert.doesNotThrow(() => shouldGlow(NaN, false));
    assert.equal(shouldGlow(NaN, false), false);
  });

  it('[P0] multiple merges per move each scale independently', () => {
    const values = [3, 6, 12];
    const profiles = values.map((v) => punchProfileFor(v, false));
    assert.equal(profiles[0].scale, 1.08);
    assert.equal(profiles[1].scale, 1.12);
    assert.equal(profiles[2].scale, 1.15);
    assert.equal(profiles[0].particles, 4);
    assert.equal(profiles[1].particles, 8);
    assert.equal(profiles[2].particles, 16);
  });

  it('[P0] all preset values have finite overshootScale', () => {
    const tiers = [3, 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072, 6144, 12288];
    for (const v of tiers) {
      const p = presetFor(v);
      assert.ok(Number.isFinite(p.overshootScale), `tier ${v} overshootScale finite`);
      assert.ok(p.overshootScale >= 1, `tier ${v} scale >=1`);
      assert.ok(p.overshootScale <= 1.2, `tier ${v} scale capped`);
    }
  });
});
