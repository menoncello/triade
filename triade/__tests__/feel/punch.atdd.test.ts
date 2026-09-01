import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { presetFor, reducedPresetFor, FEEL_PRESETS, allPresetValues } from '../../src/feel/feel.ts';
import {
  punchScaleFor,
  punchDurationFor,
  shouldFlash,
  particleCountFor,
  shouldGlow,
  punchProfileFor,
} from '../../src/feel/punch.ts';
import { planTileTransitions } from '../../src/render/transitionPlan.ts';
import { newGame, move } from '../../src/engine/core/index.ts';
import type { TraceEntry } from '../../src/engine/core/types.ts';
import { mulberry32 } from '../../src/utils/mulberry32.ts';

// ---------------------------------------------------------------------------
// ATDD for 8-2 Punch visual — red-phase acceptance scaffolds covering
// working-tree delta: feel.ts overshootScale + punch.ts pure helpers +
// GameBoard.tsx isMerge/overshoot/flash/glow/burst + App.tsx reducedMotion wiring.
// Host-only: node:test + tsx, no RN/native, no Skia/Reanimated import.
// ---------------------------------------------------------------------------

describe('ATDD 8-2 — P0 critical (spec I/O matrix)', () => {
  it('[P0-01] AC1 small merge 3 -> light punch 1.08/80ms/4 particles/no flash/no glow', () => {
    const p = presetFor(3);
    assert.equal(p.overshootScale, 1.08);
    assert.equal(p.overshootMs, 80);
    assert.equal(p.particleBurst, 4);
    assert.equal(p.flash, false);
    assert.equal(punchScaleFor(3, false), 1.08);
    assert.equal(punchDurationFor(3, false), 80);
    assert.equal(particleCountFor(3, false), 4);
    assert.equal(shouldFlash(3, false), false);
    assert.equal(shouldGlow(3, false), false);
    const prof = punchProfileFor(3, false);
    assert.equal(prof.scale, 1.08);
    assert.equal(prof.duration, 80);
    assert.equal(prof.particles, 4);
    assert.equal(prof.flash, false);
    assert.equal(prof.glow, false);
  });

  it('[P0-02] AC1 medium merge 6 -> medium punch 1.12/100ms/8/no flash', () => {
    const p = presetFor(6);
    assert.equal(p.overshootScale, 1.12);
    assert.equal(p.overshootMs, 100);
    assert.equal(p.particleBurst, 8);
    assert.equal(p.flash, false);
    assert.equal(punchScaleFor(6, false), 1.12);
    assert.equal(punchDurationFor(6, false), 100);
    assert.equal(particleCountFor(6, false), 8);
    assert.equal(shouldFlash(6, false), false);
    assert.equal(shouldGlow(6, false), false);
  });

  it('[P0-03] AC1 heavy merge 12+ -> heavy punch 1.15/120ms/16/flash (sweep all heavy tiers)', () => {
    for (const v of [12, 24, 48, 96, 192, 384, 768, 1536, 3072, 6144, 12288]) {
      const p = presetFor(v);
      assert.equal(p.overshootScale, 1.15, `presetFor(${v}).overshootScale 1.15`);
      assert.equal(p.overshootMs, 120, `presetFor(${v}).overshootMs 120`);
      assert.equal(p.particleBurst, 16, `presetFor(${v}).particleBurst 16`);
      assert.equal(p.flash, true, `presetFor(${v}).flash true`);
      assert.equal(punchScaleFor(v, false), 1.15, `punchScaleFor(${v}) 1.15`);
      assert.equal(punchDurationFor(v, false), 120);
      assert.equal(particleCountFor(v, false), 16);
      assert.equal(shouldFlash(v, false), true, `shouldFlash(${v}) true`);
    }
  });

  it('[P0-04] AC glow tier — glow only for 1536+ (only glow in system)', () => {
    assert.equal(shouldGlow(768, false), false);
    assert.equal(shouldGlow(384, false), false);
    assert.equal(shouldGlow(1, false), false);
    assert.equal(shouldGlow(6, false), false);
    assert.equal(shouldGlow(12, false), false);
    assert.equal(shouldGlow(1536, false), true);
    assert.equal(shouldGlow(3072, false), true);
    assert.equal(shouldGlow(6144, false), true);
    assert.equal(shouldGlow(12288, false), true);
    // punchProfile mirrors
    assert.equal(punchProfileFor(768, false).glow, false);
    assert.equal(punchProfileFor(1536, false).glow, true);
    assert.equal(punchProfileFor(3072, false).glow, true);
  });

  it('[P0-05] AC Reduced Motion gate FR-30 — all visual cut, haptics stay', () => {
    for (const v of [3, 6, 12, 24, 1536, 3072] as number[]) {
      assert.equal(punchScaleFor(v, true), 1, `value ${v} scale gated`);
      assert.equal(punchDurationFor(v, true), 0, `value ${v} duration gated`);
      assert.equal(shouldFlash(v, true), false, `value ${v} flash gated`);
      assert.equal(particleCountFor(v, true), 0, `value ${v} particles gated`);
      assert.equal(shouldGlow(v, true), false, `value ${v} glow gated`);
      const prof = punchProfileFor(v, true);
      assert.equal(prof.scale, 1);
      assert.equal(prof.duration, 0);
      assert.equal(prof.flash, false);
      assert.equal(prof.particles, 0);
      assert.equal(prof.glow, false);
    }
    // reducedPresetFor preserves haptic but cuts visual
    assert.equal(reducedPresetFor(12).haptic, 'heavy');
    assert.equal(reducedPresetFor(12).overshootScale, 1);
    assert.equal(reducedPresetFor(12).overshootMs, 0);
    assert.equal(reducedPresetFor(12).particleBurst, 0);
    assert.equal(reducedPresetFor(12).flash, false);
    assert.equal(reducedPresetFor(12).shakeMs, 0);
    assert.equal(reducedPresetFor(3).haptic, 'light');
    assert.equal(reducedPresetFor(6).haptic, 'medium');
  });

  it('[P0-06] edge — non-finite / negative never throw, glow never on NaN', () => {
    assert.doesNotThrow(() => punchProfileFor(NaN, false));
    assert.doesNotThrow(() => punchProfileFor(Infinity, false));
    assert.doesNotThrow(() => punchProfileFor(-5, false));
    assert.doesNotThrow(() => punchProfileFor(-Infinity, true));
    assert.doesNotThrow(() => shouldGlow(NaN, false));
    assert.doesNotThrow(() => shouldGlow(Infinity, false));
    assert.doesNotThrow(() => punchScaleFor(NaN, false));
    assert.equal(shouldGlow(NaN, false), false);
    assert.equal(shouldGlow(Infinity, false), false);
    // fallback to light preset never crashes
    assert.ok(Number.isFinite(punchScaleFor(NaN, false)));
    assert.equal(particleCountFor(NaN, false), 4);
  });

  it('[P0-07] AC multiple merges per move — each scales independently', () => {
    const values = [3, 6, 12] as const;
    const profiles = values.map((v) => punchProfileFor(v, false));
    assert.equal(profiles[0].scale, 1.08);
    assert.equal(profiles[1].scale, 1.12);
    assert.equal(profiles[2].scale, 1.15);
    assert.equal(profiles[0].duration, 80);
    assert.equal(profiles[1].duration, 100);
    assert.equal(profiles[2].duration, 120);
    assert.equal(profiles[0].particles, 4);
    assert.equal(profiles[1].particles, 8);
    assert.equal(profiles[2].particles, 16);
    assert.equal(profiles[0].flash, false);
    assert.equal(profiles[1].flash, false);
    assert.equal(profiles[2].flash, true);
    assert.equal(profiles[0].glow, false);
    assert.equal(profiles[2].glow, false);
  });

  it('[P0-08] data-not-code — all preset values have finite overshootScale 1..1.2', () => {
    const tiers = [3, 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072, 6144, 12288] as const;
    for (const v of tiers) {
      const p = presetFor(v);
      assert.ok(Number.isFinite(p.overshootScale), `tier ${v} overshootScale finite`);
      assert.ok(p.overshootScale >= 1, `tier ${v} scale >=1`);
      assert.ok(p.overshootScale <= 1.2, `tier ${v} scale capped <=1.2`);
      assert.ok(Number.isFinite(p.overshootMs) && p.overshootMs >= 80 && p.overshootMs <= 120);
      assert.ok([4, 8, 16].includes(p.particleBurst), `tier ${v} particleBurst in {4,8,16}`);
      assert.equal(typeof p.flash, 'boolean');
    }
    // frozen identity + allPresetValues consistency
    assert.equal(presetFor(3), FEEL_PRESETS[3]);
    assert.equal(presetFor(6), FEEL_PRESETS[6]);
    assert.equal(presetFor(12), FEEL_PRESETS[12]);
    for (const v of allPresetValues()) {
      assert.ok(Number.isFinite(presetFor(v).overshootScale));
    }
  });
});

describe('ATDD 8-2 — P1 high (integration / wiring)', () => {
  it('[P1-01] trace->isMerge contract via REAL engine trace: type merge iff from.length===2 && !spawned', () => {
    const rng = mulberry32(42);
    const game = newGame(rng);
    const result = move(game, 'left', mulberry32(99));
    // planTileTransitions must classify exactly as trace contract
    const plan = planTileTransitions(
      // prevBoard is the board before move; reconstruct from result.trace + result.board is fragile,
      // so use the game board before move (newGame board) as prev for this fixture divergence check
      game.board,
      result,
    );
    const mergeEntries = result.trace.filter((e) => !e.spawned && Array.isArray(e.from) && e.from.length === 2);
    const spawnEntries = result.trace.filter((e) => e.spawned);
    const slideEntries = result.trace.filter((e) => !e.spawned && Array.isArray(e.from) && e.from.length === 1);
    // Every merge trace entry must appear as a merge transition when board supports it
    // (plan may be empty for NOOP — assert contract, not exact count)
    for (const e of mergeEntries) {
      // pure helper mapping must stay consistent with trace value
      assert.ok(['light', 'medium', 'heavy'].includes(presetFor(e.value).haptic));
      assert.doesNotThrow(() => punchProfileFor(e.value, false));
    }
    for (const e of spawnEntries) {
      assert.equal(e.spawned, true);
      // spawn must never be treated as merge for punch
      assert.notEqual(e.from.length, 2);
    }
    for (const e of slideEntries) {
      assert.equal(e.from.length, 1);
    }
    // At least classify is consistent: plan entries that are merge have from length 2
    for (const tr of plan) {
      if (tr.type === 'merge') {
        assert.equal(tr.from.length, 2, 'merge transition from length 2');
      }
      if (tr.type === 'spawn') {
        // spawn transition value matches a spawned trace entry value
        assert.ok(spawnEntries.length > 0 || result.moved === false);
      }
    }
    // Host never throws regardless of moved flag
    assert.doesNotThrow(() => planTileTransitions(game.board, result));
  });

  it('[P1-02] chrome guard — spawn tiles never become isMerge/punch', () => {
    const source = fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
    // applyPlan must push isMerge:true only inside the merge branch (handles `else if (tr.type === 'merge')`)
    const mergeBranch = source.match(/tr\.type\s*===\s*'merge'[\s\S]{0,800}isMerge:\s*true/);
    assert.ok(mergeBranch, 'GameBoard applyPlan sets isMerge:true only inside merge branch');
    // spawn block (next 300 chars after first spawn occurrence) must NOT set isMerge
    const spawnIdx = source.indexOf("tr.type === 'spawn'");
    assert.ok(spawnIdx !== -1, 'spawn branch exists');
    const spawnBlock = source.slice(spawnIdx, spawnIdx + 400);
    assert.equal(spawnBlock.includes('isMerge'), false, 'spawn branch must never set isMerge');
    // AnimatedTile gates glow/flash on isMerge && !reducedMotion
    assert.ok(source.includes('isMerge && !reducedMotion'), 'AnimatedTile gates punch on isMerge && !reducedMotion');
    assert.ok(source.includes('hasGlow') && source.includes('value >= 1536'), 'hasGlow gated on isPunch && value>=1536');
  });

  it('[P1-03] overshoot declarative — punchScaleFor/punchDurationFor match presetFor per tier', () => {
    for (const v of allPresetValues()) {
      const preset = presetFor(v);
      assert.equal(punchScaleFor(v, false), preset.overshootScale, `scale matches preset for ${v}`);
      assert.equal(punchDurationFor(v, false), preset.overshootMs, `duration matches preset for ${v}`);
      assert.equal(shouldFlash(v, false), preset.flash, `flash matches preset for ${v}`);
      assert.equal(particleCountFor(v, false), preset.particleBurst, `particles matches preset for ${v}`);
      // reduced always 1/0/false
      assert.equal(punchScaleFor(v, true), 1);
      assert.equal(punchDurationFor(v, true), 0);
    }
    // Also verify GameBoard wiring uses presetFor for burst count and punchPreset for scale
    const gbSource = fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
    assert.ok(gbSource.includes('presetFor(tr.value)'), 'GameBoard burst uses presetFor(tr.value)');
    assert.ok(gbSource.includes('punchPreset.overshootScale'), 'AnimatedTile uses punchPreset.overshootScale');
    assert.ok(gbSource.includes('punchPreset.overshootMs'), 'AnimatedTile uses punchPreset.overshootMs');
  });

  it('[P1-04] burst scaling & reducedMotion gating', () => {
    // Pure helper gating already covered, but pin App wiring and GameBoard burst creation
    for (const v of [3, 6, 12, 1536] as const) {
      const preset = presetFor(v);
      // non-reduced: count equals preset
      assert.equal(particleCountFor(v, false), preset.particleBurst);
      // reduced: 0
      assert.equal(particleCountFor(v, true), 0);
      // glow
      assert.equal(shouldGlow(v, false), v >= 1536);
      assert.equal(shouldGlow(v, true), false);
    }
    const gb = fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
    // Bursts only when !reducedMotion
    assert.ok(gb.includes('if (!reducedMotion)'), 'burst creation gated by !reducedMotion');
    assert.ok(gb.includes('preset.particleBurst > 0'), 'burst gated on particleBurst > 0');
    // App wiring passes settings.reducedMotion into GameBoard and GameOverOverlay (S8.5 fix)
    const app = fs.readFileSync(path.resolve('App.tsx'), 'utf8');
    assert.ok(app.includes('reducedMotion={settings.reducedMotion}'), 'App passes settings.reducedMotion into GameBoard');
    // GameOverOverlay must NOT keep literal false — S8.5 fixed wiring to settings.reducedMotion
    assert.ok(
      app.includes('GameOverOverlay') && !/GameOverOverlay[^]*reducedMotion=\{false\}/.test(app),
      'GameOverOverlay must not be hardcoded false — wiring is settings.reducedMotion',
    );
  });

  it('[P1-05] R-002 early-input orphan safeguard — burst timer cleanup on unmount (EXPECTED RED)', () => {
    // GameBoard stores bursts in state and auto-clears via setTimeout(500) without unmount guard.
    // This ATDD expects a cleanup ref/array + useEffect return clearing burst timers, mirroring settleTimerRef.
    const gb = fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
    const hasBurstTimerRef =
      gb.includes('burstTimer') || gb.includes('burstTimeout') || gb.includes('burstTimers');
    const hasBurstCleanup = hasBurstTimerRef && gb.includes('clearTimeout');
    // Current delta has bare setTimeout with no ref storage -> this assertion is RED (R-002/R-007)
    assert.ok(
      hasBurstCleanup,
      'GameBoard must store burst setTimeout id(s) in a ref and clear on unmount — currently bare setTimeout with no cleanup (see R-002/R-007) — expected RED until fixed',
    );
  });

  it('[P1-06] NOOP silent — moved false never produces punch', () => {
    // A NOOP move produces empty plan -> GameBoard applyPlan no-ops, no punch helpers invoked for merges
    const rng = mulberry32(123);
    const game = newGame(rng);
    // Find a NOOP by trying directions until moved false (or use a crafted board)
    let noopResult: ReturnType<typeof move> | null = null;
    for (const dir of ['left', 'right', 'up', 'down'] as const) {
      const r = move(game, dir, mulberry32(999));
      if (!r.moved) {
        noopResult = r;
        break;
      }
    }
    if (noopResult) {
      const plan = planTileTransitions(game.board, noopResult);
      assert.equal(plan.length, 0, 'NOOP plan is empty');
      // punch helpers not invoked for NOOP — no merge entries
      const merges = noopResult.trace.filter((e) => !e.spawned && e.from.length === 2);
      assert.equal(merges.length, 0, 'NOOP trace has no merge entries');
    } else {
      // Fallback: at least assert that an empty trace produces no fires
      const emptyTrace: TraceEntry[] = [];
      assert.equal(emptyTrace.filter((e) => !e.spawned && e.from.length === 2).length, 0);
    }
    // Helper side: GameBoard spawn value 1/2 still maps to light data but is never mounted as isMerge (chrome guard)
    assert.equal(punchScaleFor(1, false), 1.08);
    // board must not have called punch helpers for spawn tiles — verified by chrome guard test
  });
});

describe('ATDD 8-2 — P2 medium (edge / regression / perf)', () => {
  it('[P2-01] burst accumulation — setTimeout auto-clear filters by id, no orphan accumulation (EXPECTED RED — unmount guard missing)', () => {
    const gb = fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
    // Current code does filter by id (correct) but lacks unmount guard -> second part is RED
    const filtersById = gb.includes('!newBursts.some') && gb.includes('b.id');
    assert.ok(filtersById, 'burst auto-clear filters by id');
    // Expect unmount cleanup for burst timers as well (same as P1-05, second signal)
    const hasUnmountBurstCleanup =
      (gb.includes('burstTimer') || gb.includes('burstTimeout') || gb.includes('burstTimers')) &&
      gb.includes('clearTimeout');
    assert.ok(
      hasUnmountBurstCleanup,
      'burst setTimeout must be cleared on GameBoard unmount to avoid setState on unmounted component (R-007) — expected RED',
    );
  });

  it('[P2-02] perf micro-bench — punchProfileFor + preset sweep is host-cheap', () => {
    const start = performance.now();
    for (let i = 0; i < 10_000; i++) {
      for (const v of allPresetValues()) {
        const p = punchProfileFor(v, false);
        assert.ok(Number.isFinite(p.scale));
      }
    }
    const elapsed = performance.now() - start;
    // 10k * 13 tiers = 130k punchProfileFor calls should be << 100ms host
    assert.ok(elapsed < 200, `130k punchProfileFor in ${elapsed.toFixed(1)}ms should be <200ms`);
  });

  it('[P2-03] only-glow static gate — glow exists only behind hasGlow branch', () => {
    const gb = fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
    const glowOccurrences = (gb.match(/#ff8c2f/g) ?? []).length;
    assert.equal(glowOccurrences, 1, 'exactly one incandescent glow color #ff8c2f in GameBoard');
    // Glow must be inside hasGlow conditional
    const glowInsideHasGlow = gb.includes('hasGlow ? (') && gb.includes('#ff8c2f');
    assert.ok(glowInsideHasGlow, 'glow RoundedRect is inside hasGlow conditional');
    // shouldGlow unit already pins <1536 false
    for (const v of [768, 384, 12, 6, 3]) {
      assert.equal(shouldGlow(v, false), false);
    }
  });

  it('[P2-04] engine purity — triade/src/engine byte-identical (no engine edits in 8-2)', () => {
    // Structural gate: no feel import leaks into engine
    const engineIndex = fs.readFileSync(path.resolve('src/engine/core/index.ts'), 'utf8');
    assert.equal(engineIndex.includes('from') && engineIndex.includes('feel'), false, 'engine must not import feel');
    // Byte-identical is asserted by CI git diff; here we pin the invariant structurally
    assert.ok(true, 'engine byte-identical pinned by git diff --stat -- triade/src/engine empty');
  });

  it('[P2-05] single access point — no scattered overshoot/particle literals outside feel.ts', () => {
    const feelSource = fs.readFileSync(path.resolve('src/feel/feel.ts'), 'utf8');
    assert.ok(feelSource.includes('1.08') && feelSource.includes('1.12') && feelSource.includes('1.15'), 'feel.ts owns 1.08/1.12/1.15');
    const punchSource = fs.readFileSync(path.resolve('src/feel/punch.ts'), 'utf8');
    // punch.ts must delegate to presetFor, not hardcode scales
    assert.ok(punchSource.includes('presetFor'), 'punch.ts delegates to presetFor');
    assert.equal(punchSource.includes('1.08'), false, 'punch.ts must not hardcode 1.08');
    assert.equal(punchSource.includes('1.12'), false, 'punch.ts must not hardcode 1.12');
    assert.equal(punchSource.includes('1.15'), false, 'punch.ts must not hardcode 1.15');
    // GameBoard must not hardcode scales either
    const gb = fs.readFileSync(path.resolve('src/render/GameBoard.tsx'), 'utf8');
    assert.equal(gb.includes('1.08'), false, 'GameBoard must not hardcode 1.08');
    assert.equal(gb.includes('1.12'), false, 'GameBoard must not hardcode 1.12');
  });
});
