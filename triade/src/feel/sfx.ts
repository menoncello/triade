// SFX gateway — thin swappable observer over expo-audio (S8.6, UX-DR-29)
// FR-30: Reduced Motion keeps sound — never gate on reducedMotion.
// Best-effort, never throws, never blocks gameplay. Coupled with haptics at same call site.

import { presetFor } from './feel.ts';
import type { TraceEntry } from '../engine/core/types.ts';

export type SfxKind = 'merge' | 'spawn' | 'gameOver';

export interface SfxGateway {
  play: (kind: SfxKind, volume: number) => void;
}

// Volume mapping mirrors haptic scale (3 light → 12+ heavy) — data, not code.
const VOLUME_BY_HAPTIC: Record<string, number> = {
  light: 0.45,
  medium: 0.65,
  heavy: 1.0,
};

export function sfxVolumeForValue(value: number): number {
  try {
    const preset = presetFor(value);
    const v = VOLUME_BY_HAPTIC[preset.haptic];
    if (Number.isFinite(v)) return v;
    return 0.45;
  } catch {
    return 0.45;
  }
}

export function sfxKindForValue(_value: number): SfxKind {
  return 'merge';
}

// Default fire-and-forget player — dynamic import so test envs without native module stay green.
// Guard with requireOptionalNativeModule so Expo Go / JS-only envs never attempt to load the native JS bundle
// that would throw "Cannot find native module 'ExpoAudio'" at import time (would surface as LogBox Uncaught).
let audioModulePromise: Promise<any> | null = null;
let audioAvailabilityChecked = false;
let audioAvailable: boolean | null = null;
function isExpoAudioAvailable(): boolean {
  if (audioAvailabilityChecked && audioAvailable !== null) return audioAvailable;
  audioAvailabilityChecked = true;
  try {
    // expo-modules-core is always present (transitive via expo), use optional require to avoid throw
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireOptionalNativeModule } = require('expo-modules-core') as {
      requireOptionalNativeModule: (name: string) => unknown;
    };
    audioAvailable = !!requireOptionalNativeModule('ExpoAudio');
    return audioAvailable;
  } catch {
    // test env or missing core — treat as unavailable, keep gateway as no-op
    audioAvailable = false;
    return false;
  }
}
function getAudioModule(): Promise<any> | null {
  try {
    if (!isExpoAudioAvailable()) return null;
    if (!audioModulePromise) {
      // @ts-ignore expo-audio optional — SDK 57 pinned, may not be installed in test env
      audioModulePromise = import('expo-audio').catch(() => null);
    }
    return audioModulePromise;
  } catch {
    return null;
  }
}

async function playViaExpoAudio(kind: SfxKind, volume: number): Promise<void> {
  try {
    const modPromise = getAudioModule();
    if (!modPromise) return;
    const mod: any = await modPromise;
    if (!mod) return;
    // SDK 57 expo-audio: createAudioPlayer(source, options) or AudioPlayer
    // SFX WAVs são sintéticos cálidos gerados via tools/gen-thock.py — obrigatórios para Metro bundling (não opcionais);
    // o try/catch aqui degrada apenas quando expo-audio falta (test host), e if (!source) return evita throw.
    const vol = Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 0.45));
    // Se expo-audio expõe createAudioPlayer, cria one-shot player por kind — literal require é proposital para bundling determinístico (NFR-6 offline).
    let source: any = null;
    try {
      if (kind === 'merge') source = require('../../assets/sfx/merge.wav');
      else if (kind === 'spawn') source = require('../../assets/sfx/spawn.wav');
      else if (kind === 'gameOver') source = require('../../assets/sfx/gameover.wav');
    } catch {
      source = null;
    }
    if (!source) return;
    if (typeof mod.createAudioPlayer === 'function') {
      const player = mod.createAudioPlayer(source);
      if (player) {
        if (typeof player.setVolume === 'function') player.setVolume(vol);
        else if ('volume' in player) player.volume = vol;
        if (typeof player.seekTo === 'function') try { player.seekTo(0); } catch {}
        if (typeof player.play === 'function') player.play();
        else if (typeof player.replay === 'function') player.replay();
      }
    } else if (mod.AudioPlayer) {
      try {
        const player = new mod.AudioPlayer(source);
        if (player) {
          if (typeof player.setVolume === 'function') player.setVolume(vol);
          if (typeof player.play === 'function') player.play();
        }
      } catch {}
    }
  } catch {
    // never throw
  }
}

function dispatchPlay(kind: SfxKind, volume: number, gateway?: SfxGateway | null): void {
  try {
    if (gateway && typeof gateway.play === 'function') {
      gateway.play(kind, volume);
      return;
    }
    void playViaExpoAudio(kind, volume);
  } catch {
    // never throw
  }
}

// Low-level: fire a single SFX for a merged tile value.
export function triggerSfxForMerge(value: number, gateway?: SfxGateway | null): void {
  try {
    const vol = sfxVolumeForValue(value);
    dispatchPlay('merge', vol, gateway ?? null);
  } catch {
    // never throw
  }
}

// Spawn — fixed soft volume (lighter than lightest merge)
export function triggerSfxForSpawn(value: number, gateway?: SfxGateway | null): void {
  try {
    // Spawn thock is deliberately soft — 0.35 fixed, not scaled by value beyond presence
    // Value param kept for future pitch mapping; volume stays fixed per UX-DR-29 "thock"
    void value;
    dispatchPlay('spawn', 0.35, gateway ?? null);
  } catch {
    // never throw
  }
}

export function triggerSfxForGameOver(gateway?: SfxGateway | null): void {
  try {
    dispatchPlay('gameOver', 0.9, gateway ?? null);
  } catch {
    // never throw
  }
}

// High-level: observe a MoveResult trace and fire one SFX per merge entry.
// Merge entries are trace entries where from.length===2 && spawned===false (line.ts contract).
export function triggerSfxForTrace(
  trace: readonly TraceEntry[] | undefined | null,
  gateway?: SfxGateway | null,
): void {
  try {
    if (!Array.isArray(trace) || trace.length === 0) return;
    for (const entry of trace) {
      if (!entry || entry.spawned) continue;
      if (!Array.isArray(entry.from) || entry.from.length !== 2) continue;
      triggerSfxForMerge(entry.value, gateway ?? null);
    }
  } catch {
    // never throw
  }
}
