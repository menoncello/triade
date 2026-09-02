// TEA Automate — Fixture helpers for dw-preview-boundary-hygiene
// Deterministic, no @faker-js/faker — previewFor is pure (PendingSpawn, readonly number[]) → Preview.
// Host-only: node:test + tsx, no RN/Reanimated/Skia mount, no Playwright browser.
// Spec: spec-preview-boundary-hygiene.md (DW-78/79/80/84/94 hygiene: ULP epsilon, beyond-ladder truth 192, frozen slices, deflate fan-out, baseline c7b1821 → 4a50e2c)
// Test-design: test-design-dw-preview-boundary-hygiene.md (9 risks, 2 high score 6: R-001 ULP, R-002 beyond-ladder truth)
// ATDD: triade/__tests__/game/preview-boundary-hygiene.atdd.test.ts (22 it.skip scaffolds, P0 8 + P1 7 + P2 4 + P3 3)

import { POT_CURVE, POT_BASE_VALUE } from '../../../triade/src/engine/config/spawnConfig.ts';
import { previewFor } from '../../../triade/src/game/preview.ts';
import type { PendingSpawn, Board } from '../../../triade/src/engine/core/types.ts';
import { potForTier, tierForCeiling, ceilingDetector } from '../../../triade/src/engine/core/index.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Deterministic fixtures — mirror preview.ts + engine ladder
// ---------------------------------------------------------------------------
export const PREVIEW_FIXTURES = {
  BOUNDARY: 0.6,
  WINDOW_MAX: 3,
  EPSILON: Number.EPSILON,
  ULP_PREDECESSOR: 0.6 - Number.EPSILON / 2, // rounds to 0.6 under round-to-nearest, must be range
  POT_BASE: POT_BASE_VALUE,
  FULL_LADDER: Object.freeze([1, 2, ...Object.keys(POT_CURVE).map(Number).sort((a, b) => a - b)]) as readonly number[],
  LEDGER_HASH: 'deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b1',
} as const;

export const FULL_POT_LADDER = PREVIEW_FIXTURES.FULL_LADDER;
export const RANGE_1_2 = Object.freeze([1, 2]) as readonly number[];

// PendingSpawn factory — same as helpers.ts pending helpers
export function pending(value: number, displayRoll: number): PendingSpawn {
  return { value, displayRoll };
}

// Contiguity check over FULL_POT_LADDER
export function isContiguousSlice(values: number[]): boolean {
  if (values.length === 0) return false;
  const idx = values.map((v) => FULL_POT_LADDER.indexOf(v));
  if (idx.some((i) => i === -1)) return false;
  for (let i = 1; i < idx.length; i++) {
    if (idx[i] !== idx[i - 1] + 1) return false;
  }
  return true;
}

// AvailablePot sets for sweep
export const AVAIL_SETS: Record<string, readonly number[]> = {
  singleThree: Object.freeze([3]),
  singlePadded: Object.freeze([3, 6]),
  windowed: Object.freeze([3, 6, 12, 24]),
  full: FULL_POT_LADDER,
};

// ---------------------------------------------------------------------------
// ULP & boundary helpers
// ---------------------------------------------------------------------------
export function isUlpPredecessorOf06(v: number): boolean {
  return v < 0.6 && 0.6 - v <= Number.EPSILON;
}

export function ulpCase(): { ulpRoll: number; pUlp: ReturnType<typeof previewFor> } {
  const ulpRoll = PREVIEW_FIXTURES.ULP_PREDECESSOR;
  return { ulpRoll, pUlp: previewFor(pending(12, ulpRoll)) };
}

export function boundaryPins(): Array<{ roll: number; expectKind: 'exact' | 'range' }> {
  return [
    { roll: 0.599, expectKind: 'exact' },
    { roll: 0.6, expectKind: 'range' },
    { roll: PREVIEW_FIXTURES.ULP_PREDECESSOR, expectKind: 'range' },
    { roll: 0, expectKind: 'exact' },
    { roll: 0.9, expectKind: 'range' },
  ];
}

// ---------------------------------------------------------------------------
// Beyond-ladder helpers — 192 truth-tail vs generic tail
// ---------------------------------------------------------------------------
export function isValidPotValue(v: number): boolean {
  if (v === 1 || v === 2) return true;
  const ratio = v / POT_BASE_VALUE;
  return v >= 3 && Number.isFinite(ratio) && ratio >= 1 && Number.isInteger(Math.log2(ratio));
}

export function beyondLadderCase(value: number, roll = 0.9): ReturnType<typeof previewFor> {
  return previewFor(pending(value, roll));
}

export function expectedTruthyWindowFor(value: number, avail: readonly number[] = FULL_POT_LADDER): readonly number[] {
  // Mirrors ambiguousRange logic without reimporting internals — used for fixture assertion only
  if (value === 1 || value === 2) return RANGE_1_2;
  const idx = avail.indexOf(value);
  if (idx !== -1) {
    const len = Math.min(3, avail.length - idx);
    return avail.slice(idx, idx + len);
  }
  if (value > FULL_POT_LADDER[FULL_POT_LADDER.length - 1] && isValidPotValue(value)) {
    const tail = FULL_POT_LADDER.slice(Math.max(0, FULL_POT_LADDER.length - 3 + 1));
    return Object.freeze([...tail, value].slice(-3));
  }
  // defensive fallback centered
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < FULL_POT_LADDER.length; i++) {
    const diff = Math.abs(FULL_POT_LADDER[i] - value);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  const start = Math.max(0, Math.min(best - 1, FULL_POT_LADDER.length - 3));
  return FULL_POT_LADDER.slice(start, start + 3);
}

// ---------------------------------------------------------------------------
// Frozen identity helpers
// ---------------------------------------------------------------------------
export function assertFrozen(values: readonly number[]): boolean {
  return Object.isFrozen(values);
}

export function range12Identity(): boolean {
  const r1 = previewFor(pending(1, 0.9), [3]);
  const r2 = previewFor(pending(2, 0.9), [3]);
  const r1b = previewFor(pending(1, 0.9), FULL_POT_LADDER);
  return r1.kind === 'range' && r2.kind === 'range' && r1b.kind === 'range'
    && (r1 as { values: readonly number[] }).values === (r2 as { values: readonly number[] }).values
    && (r1 as { values: readonly number[] }).values === (r1b as { values: readonly number[] }).values;
}

// ---------------------------------------------------------------------------
// Deflate helpers — App.tsx live availablePot fan-out
// ---------------------------------------------------------------------------
export function liveAvailablePotForBoard(board: Board): readonly number[] {
  return potForTier(tierForCeiling(ceilingDetector(board)));
}

export function deflateCase(): { pending: PendingSpawn; avail: readonly number[]; result: ReturnType<typeof previewFor> } {
  const p = pending(6, 0.9);
  const avail: readonly number[] = [3];
  return { pending: p, avail, result: previewFor(p, avail) };
}

// ---------------------------------------------------------------------------
// Source-scan helpers — single constants + freeze sites + ledger
// ---------------------------------------------------------------------------
function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

export function previewSrc(): string { return readSrc('triade/src/game/preview.ts'); }
export function appSrc(): string { return readSrc('triade/App.tsx'); }
export function deferredSrc(): string { return readSrc('_bmad-output/implementation-artifacts/deferred-work.md'); }
export function sprintStatusSrc(): string { return readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml'); }

export function stripCommentsAndStringsLocal(src: string): string {
  // mirror helpers.ts stripCommentsAndStrings — blank strings, remove comments
  let out = '';
  let i = 0;
  let inSingle = false, inDouble = false, inTemplate = false, inLine = false, inBlock = false, escaped = false;
  while (i < src.length) {
    const ch = src[i];
    const nxt = src[i + 1];
    if (inLine) {
      if (ch === '\n') { inLine = false; out += ch; }
      else out += ' ';
      i++; continue;
    }
    if (inBlock) {
      if (ch === '*' && nxt === '/') { inBlock = false; out += '  '; i += 2; continue; }
      if (ch === '\n') out += '\n'; else out += ' ';
      i++; continue;
    }
    if (inSingle) {
      if (!escaped && ch === "'") inSingle = false;
      escaped = ch === '\\' && !escaped;
      out += ' '; i++; continue;
    }
    if (inDouble) {
      if (!escaped && ch === '"') inDouble = false;
      escaped = ch === '\\' && !escaped;
      out += ' '; i++; continue;
    }
    if (inTemplate) {
      if (!escaped && ch === '`') inTemplate = false;
      escaped = ch === '\\' && !escaped;
      out += ' '; i++; continue;
    }
    if (ch === '/' && nxt === '/') { inLine = true; out += '  '; i += 2; continue; }
    if (ch === '/' && nxt === '*') { inBlock = true; out += '  '; i += 2; continue; }
    if (ch === "'") { inSingle = true; out += ' '; i++; continue; }
    if (ch === '"') { inDouble = true; out += ' '; i++; continue; }
    if (ch === '`') { inTemplate = true; out += ' '; i++; continue; }
    out += ch; i++;
  }
  return out;
}

export function countPreviewExactBoundary(): number {
  return (stripCommentsAndStringsLocal(previewSrc()).match(/PREVIEW_EXACT_BOUNDARY/g) ?? []).length;
}
export function countWindowMax(): number {
  return (stripCommentsAndStringsLocal(previewSrc()).match(/\bWINDOW_MAX\b/g) ?? []).length;
}
export function countObjectFreeze(): number {
  return (stripCommentsAndStringsLocal(previewSrc()).match(/Object\.freeze/g) ?? []).length;
}
export function countPotBaseValue(): number {
  return (stripCommentsAndStringsLocal(previewSrc()).match(/POT_BASE_VALUE/g) ?? []).length;
}
export function countAvailablePotDef(): number {
  return (appSrc().match(/availablePot\s*=\s*potForTier\(tierForCeiling\(ceilingDetector\(game\.board\)\)\)/g) ?? []).length;
}
export function countAvailablePotFanout(): number {
  return (appSrc().match(/previewFor\(game\.pendingSpawn,\s*availablePot\)/g) ?? []).length;
}
export function ledgerHashHits(): number {
  return deferredSrc().split(PREVIEW_FIXTURES.LEDGER_HASH).length - 1;
}
export function ledgerHasDWs(dws: string[]): boolean {
  const src = deferredSrc();
  return dws.every((dw) => src.includes(dw));
}
export function ledgerDoneCount(): number {
  return (deferredSrc().match(/status:\s*done 2026-09-02/g) ?? []).length;
}

// ---------------------------------------------------------------------------
// Bench helper — previewFor O(1) <0.05 ms per call, 10k <~50 ms
// ---------------------------------------------------------------------------
export function previewBench(iterations = 10_000): { elapsed: number; perCall: number; ok: boolean } {
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    previewFor(pending(12, 0.9));
    previewFor(pending(192, 0.9));
    previewFor(pending(6, 0.2), [3]);
  }
  const elapsed = performance.now() - t0;
  const perCall = elapsed / (iterations * 3);
  return { elapsed, perCall, ok: perCall < 0.05 };
}

// ---------------------------------------------------------------------------
// Re-exports for convenience
// ---------------------------------------------------------------------------
export {
  previewFor,
  POT_CURVE,
  POT_BASE_VALUE,
  potForTier,
  tierForCeiling,
  ceilingDetector,
};
