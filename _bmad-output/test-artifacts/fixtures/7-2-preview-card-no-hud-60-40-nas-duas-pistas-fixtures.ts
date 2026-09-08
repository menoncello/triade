/**
 * TEA Automate — fixtures for 7-2-preview-card-no-hud-60-40-nas-duas-pistas.
 * Location: _bmad-output/test-artifacts/fixtures/7-2-preview-card-no-hud-60-40-nas-duas-pistas-fixtures.ts
 * Runner: host node:test + tsx (no Playwright — RN app, pure preview seam).
 * These fixtures are shared by the gateway (API contract) and umbrella (E2E journeys)
 * specs for this story. No RNG, no Math.random — fixed values pin the 60/40 boundary exactly.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { POT_CURVE } from '../../../triade/src/engine/config/spawnConfig.ts';

// Tier value ladder — mirrors preview.ts derivation (boundary rule 4):
// fixed [1, 2] prefix + ascending POT_CURVE keys. Derived here from the same
// ENGINE CONFIG DATA so a curve retune flows through instead of rotting.
export const FULL_POT_LADDER: readonly number[] = Object.freeze([
  1,
  2,
  ...Object.keys(POT_CURVE)
    .map(Number)
    .sort((a, b) => a - b),
]);

export interface PendingLike {
  value: number;
  displayRoll: number;
}

export function pending(value: number, displayRoll: number): PendingLike {
  return { value, displayRoll };
}

// A list is a contiguous slice of the ladder if every adjacent pair is also
// adjacent in the ladder (same order). Captures "contiguous window" without
// pinning centering behavior (owned by 7.3).
export function isContiguousSlice(values: readonly number[]): boolean {
  if (values.length === 0) return false;
  const idx = values.map((v) => FULL_POT_LADDER.indexOf(v));
  if (idx.some((i) => i === -1)) return false;
  for (let i = 1; i < idx.length; i++) {
    if (idx[i] !== idx[i - 1] + 1) return false;
  }
  return true;
}

// Mirror of PreviewCard's displayOf() — the same union-defensive join logic,
// usable in host journeys without importing react-native.
export function displayOf(preview: { kind: string; value?: number; values?: unknown }): string {
  if (preview.kind === 'exact') {
    return Number.isFinite(preview.value) ? String(preview.value) : '';
  }
  const values = Array.isArray(preview.values)
    ? (preview.values as unknown[]).filter((v) => typeof v === 'number' && Number.isFinite(v as number))
    : [];
  return values.length > 0 ? (values as number[]).join('/') : '';
}

export function announcementOf(
  preview: { kind: string; value?: number; values?: unknown },
  label?: string,
): string {
  const laneNote = label ? ` (${label})` : '';
  return `Próxima${laneNote}: ${displayOf(preview)}`;
}

// Fixed boundary + D-008 fixtures (no faker — exact pins).
export const PREVIEW_FIXTURES = {
  EXACT_ROLL: 0.599,
  RANGE_ROLL: 0.6,
  HIGH_ROLL: 0.9,
  EXACT_VALUE: 12,
  RANGE_VALUES: [3, 6, 12] as const,
  NULL_LADDER_VALUE: 12,
  LANE_CLEAN: 'Clean',
  LANE_ACCELERATED: 'Accelerated',
} as const;

// Source-scan helper — resolves from repo root regardless of cwd depth.
export function readSrc(rel: string): string {
  const candidates = [
    join(process.cwd(), rel),
    join(process.cwd(), '..', rel),
    join(process.cwd(), '..', '..', rel),
  ];
  for (const c of candidates) {
    try {
      return readFileSync(c, 'utf8');
    } catch {
      // try next
    }
  }
  throw new Error(`readSrc: not found: ${rel} (cwd=${process.cwd()})`);
}

export function countMatches(src: string, re: RegExp): number {
  const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
  return (src.match(new RegExp(re.source, flags)) ?? []).length;
}
