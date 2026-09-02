// TEA Automate — Fixture helpers for 8-6 SFX haptics (expo-audio thock coupled with haptics)
// Deterministic, no @faker-js/faker — VOLUME_BY_HAPTIC + ladder 3/6/12.. is fixed data.
// Host-only: node:test + tsx, no RN/Reanimated/Skia imports. Pure helpers mirror feel/* contracts.
// Spec: spec-8-6-sfx-haptics.md (S8.6, UX-DR-29, FR-30, UX-DR-16, 4 ACs, I/O matrix 8 rows, baseline 7e1916a→b16a06e).

import { newGame, move } from '../../../triade/src/engine/core/index.ts';
import type { TraceEntry, MoveResult } from '../../../triade/src/engine/core/types.ts';
import { mulberry32 } from '../../../triade/src/utils/mulberry32.ts';
import { presetFor, reducedPresetFor, FEEL_PRESETS, allPresetValues } from '../../../triade/src/feel/feel.ts';
import { hapticsStyleForValue } from '../../../triade/src/feel/haptics.ts';
import {
  sfxVolumeForValue,
  sfxKindForValue,
  triggerSfxForMerge,
  triggerSfxForTrace,
  triggerSfxForSpawn,
  triggerSfxForGameOver,
  type SfxGateway,
  type SfxKind,
} from '../../../triade/src/feel/sfx.ts';

// ---------------------------------------------------------------------------
// TraceEntry helpers — mirror src/engine/core/line.ts + feel/* contracts
// Merge entries: from.length===2 && spawned===false && Number.isFinite(value)
// Slides: from.length===1 (no merge), Spawn: spawned===true, Hold: fromLen 1 no merge
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
export function holdEntry(value: number): TraceEntry {
  return { value, to: [1, 1], from: [[1, 1]], spawned: false } as unknown as TraceEntry;
}

// ---------------------------------------------------------------------------
// SFX volume helpers — data-not-code contract (VOLUME_BY_HAPTIC 0.45/0.65/1.0)
// Mirrors haptic scale: 3 light→0.45, 6 medium→0.65, 12+ heavy→1.0 via presetFor
// ---------------------------------------------------------------------------
export function expectedSfxVolume(value: number): number {
  const haptic = presetFor(value).haptic;
  if (haptic === 'light') return 0.45;
  if (haptic === 'medium') return 0.65;
  return 1.0;
}
export function isSfxVolumeCoupled(value: number): boolean {
  return sfxVolumeForValue(value) === expectedSfxVolume(value);
}
export function isHapticsSfxCoupled(value: number): boolean {
  const vol = sfxVolumeForValue(value);
  const style = hapticsStyleForValue(value);
  const haptic = presetFor(value).haptic;
  if (haptic === 'light') return vol === 0.45 && style === 'Light';
  if (haptic === 'medium') return vol === 0.65 && style === 'Medium';
  return vol === 1.0 && style === 'Heavy';
}
export function sfxVolumeRank(): { light: number; medium: number; heavy: number } {
  return { light: sfxVolumeForValue(3), medium: sfxVolumeForValue(6), heavy: sfxVolumeForValue(12) };
}

// ---------------------------------------------------------------------------
// Spawn / gameOver fixed volumes — S8.6 calm thock (no pitch table MVP)
// ---------------------------------------------------------------------------
export function spawnVolume(): number {
  return 0.35;
}
export function gameOverVolume(): number {
  return 0.9;
}
export function spawnIsFixedSoft(gw: { play: SfxGateway['play'] } & { calls: Array<{ kind: SfxKind; volume: number }> }): boolean {
  // exercise: spawn volume must be 0.35 regardless of value param
  const calls: Array<{ kind: SfxKind; volume: number }> = [];
  const mock: SfxGateway = { play: (k, v) => calls.push({ kind: k, volume: v }) };
  triggerSfxForSpawn(1, mock);
  triggerSfxForSpawn(2, mock);
  triggerSfxForSpawn(3, mock);
  return calls.every((c) => c.volume === 0.35 && c.kind === 'spawn');
}

// ---------------------------------------------------------------------------
// Gateway capture helper — records kind+volume for host assertions
// ---------------------------------------------------------------------------
export function captureGateway(): { gw: SfxGateway; calls: Array<{ kind: SfxKind; volume: number }>; kinds: Set<SfxKind> } {
  const calls: Array<{ kind: SfxKind; volume: number }> = [];
  const gw: SfxGateway = { play: (kind, volume) => calls.push({ kind, volume }) };
  return { gw, calls, kinds: new Set() };
}
export function sfxKindsFromCalls(calls: Array<{ kind: SfxKind; volume: number }>): Set<SfxKind> {
  return new Set(calls.map((c) => c.kind));
}
export function isOnlySfxKinds(calls: Array<{ kind: SfxKind; volume: number }>): boolean {
  const allowed: SfxKind[] = ['merge', 'spawn', 'gameOver'];
  return calls.every((c) => (allowed as string[]).includes(c.kind));
}
export function noMusicKinds(calls: Array<{ kind: string; volume: number }>): boolean {
  const lower = calls.map((c) => c.kind.toLowerCase());
  return !lower.includes('music') && !lower.includes('bgm') && !lower.some((k) => k.includes('loop'));
}

// ---------------------------------------------------------------------------
// Reduced Motion keep-sound — FR-30 never gate (sfx never reads reducedMotion)
// ---------------------------------------------------------------------------
export function sfxKeepsSoundUnderReducedMotion(values: number[] = [3, 6, 12, 1536]): boolean {
  for (const v of values) {
    if (reducedPresetFor(v).haptic !== presetFor(v).haptic) return false;
    if (sfxVolumeForValue(v) !== expectedSfxVolume(v)) return false;
  }
  return true;
}
export function sfxNeverReadsReducedMotion(sfxSrc: string): boolean {
  const codeOnly = sfxSrc.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  return !/reducedMotion/.test(codeOnly) && !/reducedPresetFor/.test(codeOnly);
}
export function appSfxNeverGated(appSrc: string): boolean {
  const sfxLines = appSrc.split('\n').filter((l) => /triggerSfxFor/.test(l));
  return sfxLines.every((l) => !l.includes('reducedMotion'));
}

// ---------------------------------------------------------------------------
// Real engine trace fixture — deterministic, no stub drift (R-001)
// Uses mulberry32 seeded RNG so trace is reproducible. Mirrors P1-01 in ATDD.
// ---------------------------------------------------------------------------
export function realEngineSfxTrace(
  seed = 42,
  dirs: Array<'left' | 'right' | 'up' | 'down'> = ['left', 'right', 'up', 'down'],
): { game: ReturnType<typeof newGame>; results: MoveResult[]; mergeEntries: TraceEntry[]; spawnEntries: TraceEntry[] } {
  const rng = mulberry32(seed);
  let game = newGame(rng);
  const results: MoveResult[] = [];
  const mergeEntries: TraceEntry[] = [];
  const spawnEntries: TraceEntry[] = [];
  for (const dir of dirs) {
    const res = move(game, dir, rng) as MoveResult;
    results.push(res);
    if (res.trace) {
      for (const e of res.trace as unknown as TraceEntry[]) {
        if (!e.spawned && Array.isArray((e as any).from) && (e as any).from.length === 2 && Number.isFinite(e.value)) {
          mergeEntries.push(e);
        }
        if ((e as any).spawned) spawnEntries.push(e);
      }
    }
    if (res.moved) game = { board: res.board, pendingSpawn: res.pendingSpawn };
  }
  return { game, results, mergeEntries, spawnEntries };
}

// ---------------------------------------------------------------------------
// SFX gateway contract — single call that asserts volume + kind per trace
// Mirrors ATDD P0 I/O matrix: merge/spawn/gameOver each scaled, coupled, never blocked
// ---------------------------------------------------------------------------
export interface SfxGatewayContract {
  tier: number;
  volume: number;
  haptic: string;
  style: string;
  coupled: boolean;
  sfxKind: SfxKind;
}
export function sfxGatewayContract(value: number): SfxGatewayContract {
  const vol = sfxVolumeForValue(value);
  const haptic = presetFor(value).haptic;
  const style = hapticsStyleForValue(value) as string;
  const coupled = isHapticsSfxCoupled(value);
  const kind = sfxKindForValue(value);
  return { tier: value, volume: vol, haptic, style, coupled, sfxKind: kind };
}
export function sfxTraceContract(trace: readonly TraceEntry[], gw: SfxGateway): Array<{ kind: SfxKind; volume: number }> {
  const calls: Array<{ kind: SfxKind; volume: number }> = [];
  const cap: SfxGateway = { play: (k, v) => calls.push({ kind: k, volume: v }) };
  // prefer injected gw when provided, else cap local
  const useGw = gw ?? cap;
  triggerSfxForTrace(trace as any, useGw);
  // if external gw provided, calls already captured there; return gw calls
  return gw ? (gw as any).calls ?? calls : calls;
}

// ---------------------------------------------------------------------------
// Swappable gateway + degrade helpers — never-throw / never-block (R-002, R-003)
// ---------------------------------------------------------------------------
export function gatewayDegradesSilentWithoutModule(): boolean {
  // Without gateway, default path is void import('expo-audio').catch(()=>null) — must not throw
  try {
    triggerSfxForMerge(6, null as any);
    triggerSfxForTrace([mergeEntry(6)] as any, null as any);
    triggerSfxForSpawn(1, null as any);
    triggerSfxForGameOver(null as any);
    return true;
  } catch {
    return false;
  }
}
export function gatewayThrowSwallowed(): boolean {
  const bad: SfxGateway = { play: () => { throw new Error('gateway boom'); } };
  try {
    triggerSfxForMerge(12, bad);
    triggerSfxForTrace([mergeEntry(12)] as any, bad);
    triggerSfxForSpawn(1, bad);
    triggerSfxForGameOver(bad);
    return true;
  } catch {
    return false;
  }
}
export function neverThrowOnNoop(): boolean {
  const gw: SfxGateway = { play: () => {} };
  try {
    triggerSfxForTrace([] as any, gw);
    triggerSfxForTrace(null as any, gw);
    triggerSfxForTrace(undefined as any, gw);
    triggerSfxForTrace([spawnEntry(1)] as any, gw);
    triggerSfxForTrace([slideEntry(3)] as any, gw);
    triggerSfxForTrace([spawnedMergeEntry(12)] as any, gw);
    sfxVolumeForValue(NaN);
    sfxVolumeForValue(Infinity);
    sfxVolumeForValue(-1 as any);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Asset manifest + require seam helpers — duplicate 6-site allowlist (R-008)
// ---------------------------------------------------------------------------
export function sfxRequireAllowlistOk(manifestSrc: string, sfxSrc: string): { manifestCount: number; sfxCount: number; ok: boolean } {
  const manifestCount = (manifestSrc.match(/require\(.*assets\/sfx/g) || []).length;
  const sfxCount = (sfxSrc.match(/require\(.*assets\/sfx/g) || []).length;
  const ok = manifestCount === 3 && sfxCount === 3;
  return { manifestCount, sfxCount, ok };
}
export function mergePredicateAllowlistOk(
  hapticsSrc: string,
  shakeSrc: string,
  bulletSrc: string,
  sfxSrc: string,
): boolean {
  for (const src of [hapticsSrc, shakeSrc, bulletSrc, sfxSrc]) {
    if (!(src.includes('from.length') && src.includes('spawned') && src.includes('Array.isArray'))) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// App coupling helper — triggerHapticsForTrace + 3 triggerSfx at same site
// ---------------------------------------------------------------------------
export function appSfxCouplingOk(appSrc: string): { hasHaptics: boolean; hasSfxTrace: boolean; hasSpawn: boolean; hasGameOver: boolean; fireAndForget: boolean; separateTry: boolean } {
  const hasHaptics = appSrc.includes('triggerHapticsForTrace');
  const hasSfxTrace = appSrc.includes('triggerSfxForTrace');
  const hasSpawn = appSrc.includes('triggerSfxForSpawn');
  const hasGameOver = appSrc.includes('triggerSfxForGameOver');
  const sfxLines = appSrc.split('\n').filter((l) => /triggerSfxFor/.test(l));
  const fireAndForget = sfxLines.every((l) => !l.includes('await'));
  const tryCount = (appSrc.match(/try\s*\{/g) || []).length;
  const separateTry = tryCount >= 4;
  return { hasHaptics, hasSfxTrace, hasSpawn, hasGameOver, fireAndForget, separateTry };
}

// ---------------------------------------------------------------------------
// Performance — host sweep of SFX helpers (budget median <0.05 / p99 <0.1)
// ---------------------------------------------------------------------------
export function sfxPerfSweep(iterations = 1000): { median: number; p99: number; max: number } {
  const tiers = allPresetValues() as readonly number[];
  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const v = tiers[i % tiers.length] as number;
    const tr = [mergeEntry(v)] as any;
    const s = performance.now();
    sfxVolumeForValue(v);
    sfxVolumeForValue(NaN);
    triggerSfxForTrace(tr, { play: () => {} });
    triggerSfxForTrace([] as any, { play: () => {} });
    triggerSfxForMerge(v, { play: () => {} });
    triggerSfxForSpawn(1, { play: () => {} });
    triggerSfxForGameOver({ play: () => {} });
    sfxKindForValue(v);
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
export { FEEL_PRESETS, allPresetValues, presetFor, reducedPresetFor };
export { sfxVolumeForValue, sfxKindForValue, triggerSfxForTrace, triggerSfxForMerge, triggerSfxForSpawn, triggerSfxForGameOver };
export type { SfxGateway, SfxKind };
