/**
 * Fixtures — dw-frame-rate-baseline-measure (DW-16 / DW-32 shared probe)
 * 120-frame window math + wiring guard-strings + scan helpers.
 * Deterministic, host-only, RN-free, no faker — the hook file imports
 * react-native-reanimated so it cannot be imported under the tsx runner;
 * tests assert math via computeFrameRateStatsReplica (byte-identical to the
 * exported computeFrameRateStats) and wiring via GUARD source substrings.
 * Covers: triade/src/render/useFrameRateBaseline.ts:11-24,48-71
 * Spec: _bmad-output/implementation-artifacts/spec-frame-rate-baseline-measure.md
 * Design: _bmad-output/test-artifacts/test-design-dw-frame-rate-baseline-measure.md
 * ATDD: triade/__tests__/render/frame-rate-baseline-measure.atdd.test.ts (12 skip scaffolds)
 *       triade/__tests__/render/useFrameRateBaseline.math.test.ts (7 pass GREEN oracle)
 * TEA-required fixture surface under test_artifacts/fixtures; no Playwright
 * test.extend — pure node:test + tsx helpers (RN Expo 57, no page.goto).
 */

import { readFileSync } from 'node:fs';

export interface FrameRateStats {
  fps: number;
  frames: number;
  p99Ms: number;
}

// ── Normative formula replica ────────────────────────────────────────────
// MUST stay byte-identical to `computeFrameRateStats` in
// triade/src/render/useFrameRateBaseline.ts:13-24
// (sorted / floor(n*0.99) / p99 / avgMs clamped at 0.001, null on empty).
export function computeFrameRateStatsReplica(samples: number[]): FrameRateStats | null {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.99);
  const p99 = sorted[Math.min(idx, sorted.length - 1)];
  const avgMs = Math.max(samples.reduce((s, v) => s + v, 0) / samples.length, 0.001);
  return { fps: 1000 / avgMs, frames: samples.length, p99Ms: p99 };
}

// ── Deterministic sample builders ────────────────────────────────────────
/** Shipped full-window shape: first callback never pushes, so 119 samples. */
export function steady119(deltaMs = 16.667): number[] {
  return Array.from({ length: 119 }, () => deltaMs);
}

/** 100 samples with one spike — floor(100*0.99)=99 selects the lone max. */
export function spike100(baseMs = 16.667, spikeMs = 50): number[] {
  return [...Array.from({ length: 99 }, () => baseMs), spikeMs];
}

/** Shipped 119 shape with one spike — floor(119*0.99)=117 SKIPS the lone
 *  max (documents the pre-existing p99 leniency deferred to DW-32). */
export function loneSpike119(baseMs = 16.667, spikeMs = 50): number[] {
  return [...Array.from({ length: 118 }, () => baseMs), spikeMs];
}

export function emptyWindow(): number[] {
  return [];
}

// ── Wiring guard-strings (must each appear in the hook source at HEAD) ───
export const GUARDS = {
  exportFn: 'export function computeFrameRateStats',
  completionCall: 'computeFrameRateStats(samples)',
  nullCheck: '=== null',
  windowFreeze: 'const WINDOW = 120',
  memoDecl: 'const onFrame = useCallback(',
  memoUse: 'useFrameCallback(onFrame)',
  resetCount: 'count.current = 0',
  resetDurations: 'durations.current = []',
  resetLast: 'last.current = 0',
  generationEffect: 'seenGeneration',
  generationResetDone: 'done.current = false',
  generationResetStats: 'setStats(null)',
} as const;

// Guard-strings that must be ABSENT pre-fix (RED proof): everything above
// except windowFreeze / generationEffect / resetCount-once (the DW-32
// generation-reset effect is unchanged by this bundle).
export const PREFIX_ABSENT = [
  'export function computeFrameRateStats',
  'useCallback(',
  'useFrameCallback(onFrame)',
  '=== null',
  'computeFrameRateStats(samples)',
] as const;

// ── Source paths + scan helpers ──────────────────────────────────────────
export const HOOK_REL = 'triade/src/render/useFrameRateBaseline.ts';
export const APP_REL = 'triade/App.tsx';
export const EVIDENCE_REL =
  '_bmad-output/implementation-artifacts/dw-16-frame-rate-baseline-evidence.md';

export function readRepoFile(absPath: string): string {
  return readFileSync(absPath, 'utf8');
}

export function countMatches(src: string, needle: string): number {
  return src.split(needle).length - 1;
}

export function assertAllPresent(src: string, needles: readonly string[], where: string): void {
  for (const n of needles) {
    if (!src.includes(n)) throw new Error(`[${where}] missing guard: ${JSON.stringify(n)}`);
  }
}

// ── Evidence-flag constants (P2 umbrella pins) ───────────────────────────
export const EVIDENCE_FLAGS = {
  shared: 'shared with DW-32',
  verdictOpen: 'STILL NO VERDICT',
  diagnosisF1: 'F1',
  diagnosisF2: 'F2',
  protocol: 'one screenshot',
} as const;
