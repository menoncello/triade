// TEA Automate — Fixture helpers for 8-5 Reduced Motion (Preset-Gated Umbrella)
// Deterministic, no @faker-js/faker — REDUCED_PRESET is fixed data, ladder 3/6/12.. is fixed.
// Host-only: node:test + tsx, no RN/Reanimated/Skia imports. Pure helpers mirror feel/* contracts.
// Spec: spec-8-5-reduced-motion.md (FR-30, UX-DR-16, ADR-04, 5 ACs, I/O matrix 7 rows, baseline 10a3449→0ec7482).

import { newGame, move } from '../../../triade/src/engine/core/index.ts';
import type { TraceEntry, MoveResult } from '../../../triade/src/engine/core/types.ts';
import { mulberry32 } from '../../../triade/src/utils/mulberry32.ts';
import { BULLET_TIME_MS, maxMergeValue, shouldTriggerBulletTime, nextSessionBest } from '../../../triade/src/feel/bulletTime.ts';
import { presetFor, reducedPresetFor, FEEL_PRESETS, allPresetValues } from '../../../triade/src/feel/feel.ts';
import { SHAKE_CAP, shakeMsFor, maxShakeForTrace, shouldShake } from '../../../triade/src/feel/shake.ts';
import {
  punchScaleFor,
  punchDurationFor,
  shouldFlash,
  particleCountFor,
  shouldGlow,
  punchProfileFor,
} from '../../../triade/src/feel/punch.ts';
import { hapticsStyleForValue } from '../../../triade/src/feel/haptics.ts';

// ---------------------------------------------------------------------------
// TraceEntry helpers — mirror src/engine/core/line.ts + feel/* contracts
// Board merge entries: from.length===2 && spawned===false && Number.isFinite(value)
// Slides: from.length===1 (no merge), Spawn: spawned===true
// ---------------------------------------------------------------------------
export function mergeEntry(value: number, to: [number, number] = [0, 0]): TraceEntry {
  return { value, to, from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry;
}
export function slideEntry(value: number, to: [number, number] = [0, 0]): TraceEntry {
  return { value, to, from: [[0, 1]], spawned: false } as unknown as TraceEntry;
}
export function spawnEntry(value: number, to: [number, number] = [3, 3]): TraceEntry {
  return { value, to, from: [], spawned: true } as unknown as TraceEntry;
}
export function spawnedMergeEntry(value: number): TraceEntry {
  return { value, to: [0, 0], from: [[0, 1], [0, 2]], spawned: true } as unknown as TraceEntry;
}
export function nonFiniteEntry(value: number): TraceEntry {
  return { value, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry;
}

// ---------------------------------------------------------------------------
// Reduced Motion umbrella — preset-not-flag contract (R-002)
// ---------------------------------------------------------------------------
export function isReducedPresetFlat(value: number): boolean {
  const r = reducedPresetFor(value);
  return r.shakeMs === 0 && r.particleBurst === 0 && r.overshootMs === 0 && r.overshootScale === 1 && r.flash === false;
}
export function hapticPreserved(value: number): boolean {
  return reducedPresetFor(value).haptic === presetFor(value).haptic;
}
export function punchFlat(value: number): boolean {
  return (
    punchScaleFor(value, true) === 1 &&
    punchDurationFor(value, true) === 0 &&
    shouldFlash(value, true) === false &&
    particleCountFor(value, true) === 0 &&
    shouldGlow(value, true) === false
  );
}
export function shakeFlatForTrace(trace: readonly TraceEntry[]): boolean {
  return maxShakeForTrace(trace as any, true) === 0 && shouldShake(trace as any, true) === false;
}
export function bulletFlat(trace: readonly TraceEntry[], best: number): boolean {
  return shouldTriggerBulletTime(trace as any, best, true) === false;
}
export function glowFlat(value: number): boolean {
  return shouldGlow(value, true) === false;
}

// ---------------------------------------------------------------------------
// Real engine trace fixture — deterministic, no stub drift (R-001, R-003)
// Uses mulberry32 seeded RNG so trace is reproducible. Mirrors P1-01 in ATDD.
// ---------------------------------------------------------------------------
export function realEngineReducedTrace(
  seed = 42,
  dirs: Array<'left' | 'right' | 'up' | 'down'> = ['left', 'right', 'up', 'down'],
): { game: ReturnType<typeof newGame>; results: MoveResult[]; merges: TraceEntry[] } {
  const rng = mulberry32(seed);
  let game = newGame(rng);
  const results: MoveResult[] = [];
  const merges: TraceEntry[] = [];
  for (const dir of dirs) {
    const res = move(game, dir, rng) as MoveResult;
    results.push(res);
    if (res.trace) {
      for (const e of res.trace as unknown as TraceEntry[]) {
        if (!e.spawned && Array.isArray((e as any).from) && (e as any).from.length === 2 && Number.isFinite(e.value)) {
          merges.push(e);
        }
      }
    }
    if (res.moved) game = { board: res.board, pendingSpawn: res.pendingSpawn };
  }
  return { game, results, merges };
}

// ---------------------------------------------------------------------------
// Umbrella gateway contract — single call that asserts every visual flat while haptics stay
// Mirrors ATDD I/O matrix 7 rows: shake, bullet, punch, glow, game-over fade, haptics, caps
// ---------------------------------------------------------------------------
export interface ReducedGatewayContract {
  tier: number;
  reducedFlat: boolean;
  hapticPreserved: boolean;
  hapticsStyle: string;
  shakeFlat: boolean;
  bulletFlat: boolean;
  punchFlat: boolean;
  glowFlat: boolean;
}
export function reducedGatewayContract(value: number, trace: readonly TraceEntry[] = [mergeEntry(value)]): ReducedGatewayContract {
  const hapticsStyle = hapticsStyleForValue(value) as string;
  return {
    tier: value,
    reducedFlat: isReducedPresetFlat(value),
    hapticPreserved: hapticPreserved(value),
    hapticsStyle,
    shakeFlat: shakeMsFor(value, true) === 0,
    bulletFlat: bulletFlat(trace, 0),
    punchFlat: punchFlat(value),
    glowFlat: glowFlat(value),
  };
}

// ---------------------------------------------------------------------------
// Session best + undo helpers — same as bullet fixtures, reused for bullet-gated umbrella
// ---------------------------------------------------------------------------
export function sessionBestSequence(traces: Array<readonly TraceEntry[]>, initial = 0): number[] {
  const seq: number[] = [];
  let best = initial;
  for (const t of traces) {
    best = nextSessionBest(t as any, best);
    seq.push(best);
  }
  return seq;
}

// ---------------------------------------------------------------------------
// Datum / cap helpers — single-source checks (SHAKE_CAP 8, BULLET 200, FADE 280)
// ---------------------------------------------------------------------------
export function capTimings(): { shakeCap: number; bulletMs: number; bulletIn: number; bulletOut: number; fadeMs: number } {
  return { shakeCap: SHAKE_CAP, bulletMs: BULLET_TIME_MS, bulletIn: 60, bulletOut: BULLET_TIME_MS - 60, fadeMs: 280 };
}
export function isShakeCapSingleSource(shakeSrc: string): boolean {
  return shakeSrc.includes('SHAKE_CAP = 8') && !shakeSrc.includes('Math.min(raw, 7)');
}
export function isBulletDatumSingleSource(gameBoardSrc: string, bulletSrc: string): boolean {
  const hasImport = gameBoardSrc.includes('BULLET_TIME_MS');
  const hasDerived = gameBoardSrc.includes('BULLET_TIME_MS - 60');
  const bulletBlock = gameBoardSrc.slice(
    gameBoardSrc.indexOf('bulletFlash.value = withSequence') >= 0
      ? gameBoardSrc.indexOf('bulletFlash.value = withSequence')
      : 0,
  );
  const noHardcoded140 = !bulletBlock.includes('duration: 140');
  const hasDatum = bulletSrc.includes('BULLET_TIME_MS = 200');
  return hasImport && hasDerived && noHardcoded140 && hasDatum;
}

// ---------------------------------------------------------------------------
// App wiring / allowlist assertions — TEA static gates (R-001, R-003, R-009)
// ---------------------------------------------------------------------------
export function feelPresetAllowlistOk(feelSrc: string, punchSrc: string, shakeSrc: string, bulletSrc: string, hapticsSrc: string): boolean {
  const feelHasReduced = feelSrc.includes('REDUCED_PRESET') && feelSrc.includes('reducedPresetFor');
  const punchDelegates = punchSrc.includes('reducedPresetFor') && punchSrc.includes('reducedMotion');
  const shakeDelegates = shakeSrc.includes('reducedPresetFor') && shakeSrc.includes('reducedMotion');
  const bulletGates = bulletSrc.includes('reducedMotion') && bulletSrc.includes('if (reducedMotion) return false');
  const hapticsCodeOnly = hapticsSrc
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
  const hapticsNoGate = !/reducedMotion/.test(hapticsCodeOnly);
  return feelHasReduced && punchDelegates && shakeDelegates && bulletGates && hapticsNoGate;
}
export function appWiringOk(appSrc: string): { hasTwoSites: boolean; noHardcodedFalse: boolean } {
  const matches = (appSrc.match(/reducedMotion=\{settings\.reducedMotion\}/g) || []).length;
  const noHardcodedFalse = !/GameOverOverlay[^]*reducedMotion=\{false\}/.test(appSrc);
  return { hasTwoSites: matches >= 2, noHardcodedFalse };
}

// ---------------------------------------------------------------------------
// Performance — host sweep of umbrella helpers (mirrors feel.bench.test.ts budget median <0.05 / p99 <0.1)
// ---------------------------------------------------------------------------
export function umbrellaPerfSweep(iterations = 1000): { median: number; p99: number; max: number } {
  const tiers = allPresetValues() as readonly number[];
  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const v = tiers[i % tiers.length] as number;
    const tr = [mergeEntry(v)] as any;
    const s = performance.now();
    presetFor(v);
    reducedPresetFor(v);
    punchScaleFor(v, false);
    punchScaleFor(v, true);
    punchProfileFor(v, true);
    shakeMsFor(v, false);
    shakeMsFor(v, true);
    maxShakeForTrace(tr, false);
    maxShakeForTrace(tr, true);
    shouldShake(tr, false);
    shouldShake(tr, true);
    shouldTriggerBulletTime(tr, 0, false);
    shouldTriggerBulletTime(tr, 0, true);
    nextSessionBest(tr, 0);
    shouldGlow(v, false);
    shouldGlow(v, true);
    hapticsStyleForValue(v);
    samples.push(performance.now() - s);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    median: sorted[Math.floor(sorted.length / 2)]!,
    p99: sorted[Math.floor(sorted.length * 0.99)]!,
    max: sorted[sorted.length - 1]!,
  };
}

// ---------------------------------------------------------------------------
// Re-export useful invariants for tests without duplicating literals
// ---------------------------------------------------------------------------
export { FEEL_PRESETS, allPresetValues, BULLET_TIME_MS, SHAKE_CAP };
