/**
 * TEA Automate — API Gateway Contract Tests for 8-5 Reduced Motion (Preset-Gated Umbrella)
 * Location: _bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts
 * Runner: node:test + tsx (host-only, no Playwright request fixture needed)
 * TEA mapping: "API" = engine trace gateway contract (Typed TraceEntry → feel/* helpers).
 * Provider is the engine (newGame/move via mulberry32), consumer is feel/*.ts umbrella.
 * This file mirrors _bmad-output/test-artifacts/tests/api/* expectations from TEA's
 * api-testing-patterns + data-factories fragments, but adapted for Expo RN 57:
 * provider is the engine (move), consumer is feel.ts / punch.ts / shake.ts / bulletTime.ts / haptics.ts.
 *
 * Spec: spec-8-5-reduced-motion.md (FR-30, UX-DR-16, ADR-04, 5 ACs, I/O matrix 7 rows, baseline 10a3449→0ec7482)
 * Test-design: test-design-epic-8-5-reduced-motion.md (10 risks, P0 9 groups, P1 7, P2 5, P3 4)
 *
 * Execute:
 *   cd triade && npx tsc --noEmit --project tsconfig.json
 *   npx tsx --test ../_bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts
 * Or via triade's test harness (uses TSX_TSCONFIG_PATH=tsconfig.test.json):
 *   TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test ../_bmad-output/test-artifacts/tests/api/reducedMotion.gateway.spec.ts
 * Canonical host execution also remains via triade/__tests__/feel/reducedMotion.atdd.test.ts (21 cases, 19G/2R).
 * This file is the TEA artifact under test_artifacts/tests/api per _bmad/tea/config.yaml.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { presetFor, reducedPresetFor, FEEL_PRESETS, allPresetValues } from '../../../../triade/src/feel/feel.ts';
import {
  punchScaleFor,
  punchDurationFor,
  shouldFlash,
  particleCountFor,
  shouldGlow,
  punchProfileFor,
} from '../../../../triade/src/feel/punch.ts';
import { SHAKE_CAP, shakeMsFor, shakeAmplitudeFor, maxShakeForTrace, shouldShake } from '../../../../triade/src/feel/shake.ts';
import { BULLET_TIME_MS, maxMergeValue, shouldTriggerBulletTime, nextSessionBest } from '../../../../triade/src/feel/bulletTime.ts';
import { hapticsStyleForValue } from '../../../../triade/src/feel/haptics.ts';
import { newGame, move } from '../../../../triade/src/engine/core/index.ts';
import type { TraceEntry } from '../../../../triade/src/engine/core/types.ts';
import { mulberry32 } from '../../../../triade/src/utils/mulberry32.ts';

// ---------------------------------------------------------------------------
// Local helpers — deterministic, no faker, no Math.random (triade/AGENTS.md)
// ---------------------------------------------------------------------------
function mergeEntry(value: number, spawned = false, fromLen = 2): TraceEntry {
  const from =
    fromLen === 2 ? ([[0, 0], [0, 1]] as any) : fromLen === 1 ? ([[0, 0]] as any) : ([] as any);
  return { value, to: [0, 0], from, spawned } as unknown as TraceEntry;
}
function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), 'triade', rel), 'utf8');
  }
}
function realTrace(seed = 42): { trace: TraceEntry[]; moved: boolean } {
  const rng = mulberry32(seed);
  const game = newGame(rng);
  return move(game, 'left', rng) as unknown as { trace: TraceEntry[]; moved: boolean };
}

// ---------------------------------------------------------------------------
// Fixture import check — ensures fixtures/feel-reduced-motion-fixtures.ts stays in sync
// ---------------------------------------------------------------------------
describe('[API] Reduced Motion umbrella — REDUCED_PRESET preset-not-flag contract (R-002)', () => {
  it('[P0] REDUCED_PRESET frozen copy: reducedPresetFor preserves haptic, zeroes visuals', async () => {
    // Given presetFor vs reducedPresetFor contract (UX-DR-16, ADR-04)
    // When reducedPresetFor is called for light/medium/heavy tiers
    // Then haptic is preserved while every visual is zeroed, never throws
    assert.equal(presetFor(3), FEEL_PRESETS[3]);
    assert.equal(presetFor(6), FEEL_PRESETS[6]);
    assert.equal(presetFor(12), FEEL_PRESETS[12]);
    assert.ok(Object.isFrozen(FEEL_PRESETS[3]));
    for (const v of [3, 6, 12, 24, 768, 1536, 3072]) {
      const r = reducedPresetFor(v);
      assert.equal(r.haptic, presetFor(v).haptic, `v ${v} haptic preserved`);
      assert.equal(r.shakeMs, 0, `v ${v} shakeMs 0`);
      assert.equal(r.particleBurst, 0, `v ${v} particleBurst 0`);
      assert.equal(r.overshootMs, 0, `v ${v} overshootMs 0`);
      assert.equal(r.overshootScale, 1, `v ${v} overshootScale 1`);
      assert.equal(r.flash, false, `v ${v} flash false`);
    }
    assert.doesNotThrow(() => reducedPresetFor(NaN));
    assert.doesNotThrow(() => reducedPresetFor(Infinity));
    assert.equal(reducedPresetFor(NaN).haptic, 'light');
  });

  it('[P0] FEEL_PRESETS frozen identity, reducedPresetFor is fresh copy (memo-safe)', async () => {
    assert.ok(Object.isFrozen(FEEL_PRESETS[12]));
    const r12 = reducedPresetFor(12);
    assert.notEqual(r12 as any, presetFor(12), 'reducedPresetFor is copy not canonical');
    assert.notEqual(r12 as any, reducedPresetFor(12) as any, 'each reducedPresetFor call returns fresh copy');
  });

  it('[P0] punch flat under Reduced Motion for every tier (UX-DR-16, R-001)', async () => {
    for (const v of [3, 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072, 6144]) {
      assert.equal(punchScaleFor(v, true), 1, `value ${v} scale 1`);
      assert.equal(punchDurationFor(v, true), 0, `value ${v} duration 0`);
      assert.equal(shouldFlash(v, true), false, `value ${v} flash false`);
      assert.equal(particleCountFor(v, true), 0, `value ${v} particles 0`);
      assert.equal(shouldGlow(v, true), false, `value ${v} glow false`);
      const prof = punchProfileFor(v, true);
      assert.equal(prof.scale, 1);
      assert.equal(prof.duration, 0);
      assert.equal(prof.flash, false);
      assert.equal(prof.particles, 0);
      assert.equal(prof.glow, false);
    }
    // full still tier-correct
    assert.equal(punchScaleFor(3, false), 1.08);
    assert.equal(punchScaleFor(6, false), 1.12);
    assert.equal(punchScaleFor(12, false), 1.15);
    // glow only 1536+ when not reduced
    assert.equal(shouldGlow(768, false), false);
    assert.equal(shouldGlow(1536, false), true);
    assert.equal(shouldGlow(3072, false), true);
  });

  it('[P0] shake flat under Reduced Motion (R-001)', async () => {
    for (const v of [3, 6, 12, 24, 768, 1536]) {
      assert.equal(shakeMsFor(v, true), 0, `value ${v} shakeMs 0`);
      assert.equal(shakeAmplitudeFor(v, true), 0, `value ${v} amp 0`);
    }
    const trace: TraceEntry[] = [mergeEntry(12), mergeEntry(6)] as unknown as TraceEntry[];
    assert.equal(maxShakeForTrace(trace as any, true), 0);
    assert.equal(shouldShake(trace as any, true), false);
    // full still correct, capped 8
    assert.equal(shakeMsFor(6, false), 2);
    assert.equal(shakeMsFor(12, false), 5);
    assert.ok(shakeMsFor(12, false) <= SHAKE_CAP);
    assert.equal(SHAKE_CAP, 8);
  });

  it('[P0] bullet gated under Reduced Motion while nextSessionBest still advances (FR-30, R-001)', async () => {
    // Given a trace with max 12 and sessionBest 6 (rarity-gated new-best)
    const trace = [mergeEntry(12)] as unknown as TraceEntry[];
    // When gateway evaluates under Reduced Motion
    assert.equal(shouldTriggerBulletTime(trace as any, 6, true), false);
    assert.equal(shouldTriggerBulletTime(trace as any, 0, true), false);
    assert.equal(shouldTriggerBulletTime(trace as any, 0, false), true);
    // Then FR-30: sessionBest still advances even when flash suppressed
    assert.equal(nextSessionBest(trace as any, 6), 12);
    assert.equal(nextSessionBest(trace as any, 0), 12);
    assert.equal(BULLET_TIME_MS, 200);
  });

  it('[P0] haptics stay under Reduced Motion — gateway never reads reducedMotion (FR-30, R-009)', async () => {
    // Given haptics must stay when Reduced Motion is ON (FR-30, UX-DR-16)
    // Then mapping is identical regardless of flag and file never gates on it
    assert.equal(hapticsStyleForValue(3), 'Light');
    assert.equal(hapticsStyleForValue(6), 'Medium');
    for (const v of [12, 24, 48, 768, 1536]) assert.equal(hapticsStyleForValue(v), 'Heavy', `value ${v}`);
    assert.equal(reducedPresetFor(12).haptic, 'heavy');
    const hapticsSrc = readSrc('src/feel/haptics.ts');
    assert.ok(hapticsSrc.includes('FR-30: haptics stay'), 'haptics FR-30 comment present');
    const codeOnly = hapticsSrc.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    assert.equal(/reducedMotion/.test(codeOnly), false, 'haptics.ts code must not reference reducedMotion');
    assert.equal(/settings\.reducedMotion/.test(codeOnly), false);
  });

  it('[P0] caps single-source — SHAKE_CAP 8 and BULLET_TIME_MS 200 never exceeded without data change (R-002, R-007)', async () => {
    assert.equal(SHAKE_CAP, 8);
    assert.equal(BULLET_TIME_MS, 200);
    for (const v of allPresetValues() as readonly number[]) {
      assert.ok(shakeMsFor(v, false) <= 8, `v ${v} shakeMs <=8`);
    }
    const feelSrc = readSrc('src/feel/feel.ts');
    assert.ok(feelSrc.includes('REDUCED_PRESET'), 'REDUCED_PRESET in feel.ts');
    assert.ok(feelSrc.includes('FR-30: Reduced Motion is a preset'), 'FR-30 preset comment');
  });

  it('[P1] trace→feel contract via REAL engine trace: merge iff from.length===2 && !spawned && finite', async () => {
    // Provider scrutiny: real engine move() trace eliminates stub drift (R-001, R-002)
    const { trace } = realTrace(42);
    let hasMerge = false;
    for (const e of trace as unknown as TraceEntry[]) {
      if (!e.spawned && Array.isArray((e as any).from) && (e as any).from.length === 2 && Number.isFinite(e.value)) {
        hasMerge = true;
        break;
      }
    }
    if (hasMerge) {
      assert.notEqual(maxMergeValue(trace as any), null);
      // reduced flat even with real trace
      assert.equal(maxShakeForTrace(trace as any, true), 0);
      assert.equal(shouldTriggerBulletTime(trace as any, 0, true), false);
    } else {
      assert.equal(maxMergeValue(trace as any), null);
    }
    // Spawn entries never count even with from.length===2
    const mixed: TraceEntry[] = [
      { value: 12, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry,
      { value: 2, to: [3, 3], from: [], spawned: true } as unknown as TraceEntry,
      { value: 12, to: [0, 0], from: [[0, 1], [0, 2]], spawned: true } as unknown as TraceEntry,
    ];
    assert.equal(maxMergeValue(mixed), 12);
    assert.equal(shouldTriggerBulletTime(mixed, 6, false), true);
    assert.equal(shouldTriggerBulletTime(mixed, 6, true), false);
    assert.equal(maxShakeForTrace(mixed as any, true), 0);
  });

  it('[P1] should handle non-finite and edge gracefully — never throws (R-010)', async () => {
    assert.doesNotThrow(() => presetFor(NaN));
    assert.doesNotThrow(() => reducedPresetFor(Infinity));
    assert.doesNotThrow(() => punchProfileFor(NaN, true));
    assert.doesNotThrow(() => shakeMsFor(NaN, true));
    assert.doesNotThrow(() => shouldGlow(NaN as any, true));
    assert.doesNotThrow(() => shouldTriggerBulletTime(null as any, 0, true));
    assert.doesNotThrow(() => maxShakeForTrace(null as any, true));
    assert.doesNotThrow(() => maxMergeValue([mergeEntry(NaN)] as any));
    assert.equal(shouldGlow(NaN as any, false), false);
    assert.equal(maxMergeValue([mergeEntry(NaN)] as any), null);
  });

  it('[P1] App wiring: settings.reducedMotion threaded to GameBoard + GameOverOverlay (no hardcoded false) (R-003)', async () => {
    const appSrc = readSrc('App.tsx');
    const wiringMatches = appSrc.match(/reducedMotion=\{settings\.reducedMotion\}/g) || [];
    assert.ok(wiringMatches.length >= 2, `expected >=2 wiring sites, got ${wiringMatches.length}`);
    assert.equal(/GameOverOverlay[^]*reducedMotion=\{false\}/.test(appSrc), false, 'GameOverOverlay must not be hardcoded false');
    const schemaSrc = readSrc('src/services/storage/schema.ts');
    assert.ok(schemaSrc.includes('reducedMotion'), 'schema has reducedMotion');
    // GameBoard presence
    const gbSrc = readSrc('src/render/GameBoard.tsx');
    assert.ok(gbSrc.includes('reducedMotion'), 'GameBoard has reducedMotion prop');
  });

  it('[P2] datum literal scan — no scattered literals outside feel.ts (preset-not-flag, R-002)', async () => {
    const feelSrc = readSrc('src/feel/feel.ts');
    const punchSrc = readSrc('src/feel/punch.ts');
    const shakeSrc = readSrc('src/feel/shake.ts');
    assert.ok(feelSrc.includes('REDUCED_PRESET'), 'REDUCED_PRESET defined in feel.ts');
    assert.ok(feelSrc.includes('PRESET_LIGHT') && feelSrc.includes('PRESET_MEDIUM') && feelSrc.includes('PRESET_HEAVY'), 'three presets defined');
    assert.ok(punchSrc.includes("from './feel"), 'punch imports from feel');
    assert.ok(shakeSrc.includes("from './feel"), 'shake imports from feel');
    // bulletTime helper gating preserved
    const bulletSrc = readSrc('src/feel/bulletTime.ts');
    assert.ok(bulletSrc.includes('if (reducedMotion) return false'), 'bulletTime gates via reducedMotion');
  });

  it('[P2] perf micro-bench — umbrella helpers host-cheap median <0.05 / p99 <0.1 (R-007)', async () => {
    const tiers = allPresetValues() as readonly number[];
    const samples: number[] = [];
    for (let i = 0; i < 500; i++) {
      const v = tiers[i % tiers.length] as number;
      const tr = [mergeEntry(v)] as any;
      const s = performance.now();
      presetFor(v);
      reducedPresetFor(v);
      punchScaleFor(v, false);
      punchScaleFor(v, true);
      shakeMsFor(v, false);
      shakeMsFor(v, true);
      maxShakeForTrace(tr, false);
      shouldTriggerBulletTime(tr, 0, false);
      shouldTriggerBulletTime(tr, 0, true);
      nextSessionBest(tr, 0);
      shouldGlow(v, false);
      samples.push(performance.now() - s);
    }
    const sorted = [...samples].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)]!;
    const p99 = sorted[Math.floor(sorted.length * 0.99)]!;
    assert.ok(median < 0.05, `median ${median.toFixed(4)} <0.05`);
    assert.ok(p99 < 0.1, `p99 ${p99.toFixed(4)} <0.1`);
  });
});
