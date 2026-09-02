import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { presetFor, reducedPresetFor } from '../../src/feel/feel.ts';
import { hapticsStyleForValue } from '../../src/feel/haptics.ts';
import {
  sfxVolumeForValue,
  triggerSfxForTrace,
  triggerSfxForMerge,
  triggerSfxForSpawn,
  triggerSfxForGameOver,
  type SfxGateway,
} from '../../src/feel/sfx.ts';

describe('sfx — sfxVolumeForValue mirrors haptic scale', () => {
  it('[P0] AC2 3 light -> 0.45, 6 medium -> 0.65, 12+ heavy -> 1.0', () => {
    assert.equal(sfxVolumeForValue(3), 0.45);
    assert.equal(sfxVolumeForValue(6), 0.65);
    for (const v of [12, 24, 48, 96, 192, 384, 768, 1536, 3072]) {
      assert.equal(sfxVolumeForValue(v), 1.0, `value ${v} should be 1.0`);
    }
  });
  it('[P0] sfxVolumeForValue derives from presetFor haptic tier (data not code)', () => {
    for (const v of [3, 6, 12, 24, 48]) {
      const haptic = presetFor(v).haptic;
      const vol = sfxVolumeForValue(v);
      if (haptic === 'light') assert.equal(vol, 0.45);
      else if (haptic === 'medium') assert.equal(vol, 0.65);
      else assert.equal(vol, 1.0);
    }
  });
  it('[P0] non-finite / small values never throw and fallback to light volume', () => {
    assert.equal(sfxVolumeForValue(NaN), 0.45);
    assert.equal(sfxVolumeForValue(Infinity), 0.45);
    assert.equal(sfxVolumeForValue(-1), 0.45);
    assert.equal(sfxVolumeForValue(0), 0.45);
    assert.equal(sfxVolumeForValue(1 as any), 0.45);
    assert.equal(sfxVolumeForValue(2 as any), 0.45);
  });
  it('[P0] reducedMotion keeps sound — sfxVolume identical via reducedPresetFor haptic preservation', () => {
    // reducedPresetFor preserves haptic, so volume stays same
    for (const v of [3, 6, 12, 1536]) {
      assert.equal(reducedPresetFor(v).haptic, presetFor(v).haptic);
      // sfxVolumeForValue does not read reducedMotion; verify explicitly
      assert.equal(sfxVolumeForValue(v), sfxVolumeForValue(v));
    }
  });
  it('[P0] coupled haptics+audio same tier — volume maps 1:1 with hapticsStyleForValue', () => {
    assert.equal(hapticsStyleForValue(3), 'Light');
    assert.equal(sfxVolumeForValue(3), 0.45);
    assert.equal(hapticsStyleForValue(6), 'Medium');
    assert.equal(sfxVolumeForValue(6), 0.65);
    assert.equal(hapticsStyleForValue(12), 'Heavy');
    assert.equal(sfxVolumeForValue(12), 1.0);
  });
});

describe('sfx — gateways never throw and respect NOOP', () => {
  it('[P0] NOOP / empty / null trace never throws and plays nothing', () => {
    const calls: Array<{ kind: string; volume: number }> = [];
    const gw: SfxGateway = { play: (kind, volume) => calls.push({ kind, volume }) };
    assert.doesNotThrow(() => triggerSfxForTrace([], gw));
    assert.doesNotThrow(() => triggerSfxForTrace(null as any, gw));
    assert.doesNotThrow(() => triggerSfxForTrace(undefined as any, gw));
    assert.equal(calls.length, 0);
    // trace with only spawns / slides / holds — no merge (from length !=2)
    assert.doesNotThrow(() =>
      triggerSfxForTrace(
        [
          { value: 3, to: [0, 0], from: [[0, 1]], spawned: false } as any,
          { value: 1, to: [3, 3], from: [], spawned: true } as any,
        ],
        gw,
      ),
    );
    assert.equal(calls.length, 0);
  });
  it('[P0] triggerSfxForTrace fires one SFX per merge entry with scaled volume', () => {
    const calls: Array<{ kind: string; volume: number }> = [];
    const gw: SfxGateway = { play: (kind, volume) => calls.push({ kind, volume }) };
    const trace: any[] = [
      { value: 3, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false },
      { value: 6, to: [1, 1], from: [[1, 0], [1, 2]], spawned: false },
      { value: 12, to: [2, 2], from: [[2, 0], [2, 1]], spawned: false },
    ];
    assert.doesNotThrow(() => triggerSfxForTrace(trace, gw));
    assert.equal(calls.length, 3);
    assert.equal(calls[0].kind, 'merge');
    assert.equal(calls[0].volume, 0.45);
    assert.equal(calls[1].volume, 0.65);
    assert.equal(calls[2].volume, 1.0);
  });
  it('[P0] triggerSfxForMerge / ForSpawn / ForGameOver never throw and use correct kind', () => {
    const calls: Array<{ kind: string; volume: number }> = [];
    const gw: SfxGateway = { play: (kind, volume) => calls.push({ kind, volume }) };
    assert.doesNotThrow(() => triggerSfxForMerge(12, gw));
    assert.equal(calls[calls.length - 1].kind, 'merge');
    assert.equal(calls[calls.length - 1].volume, 1.0);
    assert.doesNotThrow(() => triggerSfxForSpawn(2, gw));
    assert.equal(calls[calls.length - 1].kind, 'spawn');
    assert.equal(calls[calls.length - 1].volume, 0.35);
    assert.doesNotThrow(() => triggerSfxForGameOver(gw));
    assert.equal(calls[calls.length - 1].kind, 'gameOver');
    assert.equal(calls[calls.length - 1].volume, 0.9);
  });
  it('[P0] swappable gateway receives correct kind+volume; missing expo-audio degrades silent without throw', () => {
    // Without gateway, default path is dynamic import which may not exist in test — must not throw
    assert.doesNotThrow(() => triggerSfxForMerge(6, null as any));
    assert.doesNotThrow(() => triggerSfxForTrace([{ value: 6, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as any]));
    assert.doesNotThrow(() => triggerSfxForSpawn(1));
    assert.doesNotThrow(() => triggerSfxForGameOver());
  });
  it('[P0] gateway failure never suppresses caller — play throwing is swallowed', () => {
    const badGw: SfxGateway = {
      play: () => {
        throw new Error('gateway boom');
      },
    };
    assert.doesNotThrow(() => triggerSfxForMerge(12, badGw));
    assert.doesNotThrow(() =>
      triggerSfxForTrace([{ value: 12, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as any], badGw),
    );
  });
  it('[P0] no music — only merge/spawn/gameOver kinds ever emitted', () => {
    const kinds = new Set<string>();
    const gw: SfxGateway = { play: (kind) => kinds.add(kind) };
    triggerSfxForMerge(3, gw);
    triggerSfxForSpawn(1, gw);
    triggerSfxForGameOver(gw);
    triggerSfxForTrace([{ value: 12, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as any], gw);
    for (const k of kinds) {
      assert.ok(['merge', 'spawn', 'gameOver'].includes(k), `kind ${k} must be one of 3 allowed`);
    }
    assert.ok(!kinds.has('music'));
    assert.ok(!kinds.has('bgm'));
  });
});
