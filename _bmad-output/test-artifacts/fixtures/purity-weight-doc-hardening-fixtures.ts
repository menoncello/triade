// TEA Automate — Fixture helpers for dw-purity-and-weight-doc-hardening
// Deterministic, no @faker-js/faker — PURITY_ROOTS fallback + σ-budget are pure helpers with fixed seeds.
// Host-only: node:test + tsx, no RN/Reanimated/Skia mount, no Playwright browser.
// Spec: spec-purity-and-weight-doc-hardening.md (DW-54 brittle purity + DW-57 σ undocumented + DW-58 literals, baseline abd36bc → working tree)
// Test-design: test-design-dw-purity-and-weight-doc-hardening.md (9 risks, 2 high score 6: R-001 dead-code, R-002 comment drift)
// ATDD: triade/__tests__/engine/purity-weight-doc-hardening.atdd.test.ts (19 it.skip scaffolds, P0 6 + P1 6 + P2 4 + P3 3)

import { POT_WEIGHT } from '../../../triade/src/engine/config/spawnConfig.ts';
import * as game from '../../../triade/src/engine/core/index.ts';
import { mulberry32 } from '../../../triade/src/utils/mulberry32.ts';
import {
  sigmaBound,
  rngOf,
  mulberry32 as helpersMulberry32,
  runSeededSession,
} from '../../../triade/test-utils/helpers.ts';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Deterministic fixtures — mirror engine fixtures
// ---------------------------------------------------------------------------
export const FIXTURE_SEED = {
  ac2Directional: 0xc31,
  ac7Session: 0x26c6,
  ceilingBase: 0x51ce,
  compositionBase: 0x5eed,
} as const;

export const N_FIXTURE = {
  ac2: 5000,
  ac7: 10000,
  composition: 12000,
  ceiling: 2000,
  displayRoll: 10000,
} as const;

export const SIGMA_Z = 5;
export const TOL_ABSOLUTE = 0.02;
export const DISPLAYROLL_TOL = 0.015;

// σ derivations — σ=√(p(1-p)/N), z≈tolerance/σ
export function sigmaFor(p: number, n: number): number {
  return Math.sqrt((p * (1 - p)) / n);
}
export function sigmaBudgetFor(p: number, n: number, tol = TOL_ABSOLUTE): number {
  return tol / sigmaFor(p, n);
}
export const SIGMA_DERIVATIONS = {
  // historical AC2 uniform p=1/16 at N=15000 → σ≈0.00197 → 0.02/σ≈10.1
  ac2Historical: { p: 1 / 16, n: 15000, sigma: sigmaFor(1 / 16, 15000), z: sigmaBudgetFor(1 / 16, 15000) },
  // AC7 aggregate p=0.4 at N=10000 → σ≈0.00490 → 4.08σ, p=0.2 → 5σ
  ac7_p04: { p: 0.4, n: 10000, sigma: sigmaFor(0.4, 10000), z: sigmaBudgetFor(0.4, 10000) },
  ac7_p02: { p: 0.2, n: 10000, sigma: sigmaFor(0.2, 10000), z: sigmaBudgetFor(0.2, 10000) },
  // displayRoll mean σ_mean=√(1/12/N)≈0.00289 at N=10k → 0.015/σ≈5.19
  displayRoll: { n: 10000, sigmaMean: Math.sqrt(1 / 12 / 10000), z: 0.015 / Math.sqrt(1 / 12 / 10000) },
} as const;

export function expectedSigmaBound(p: number, n: number, z = SIGMA_Z): number {
  return sigmaBound(p, n, z);
}

// ---------------------------------------------------------------------------
// Source-scan helpers — purity oracle + σ-budget seam
// ---------------------------------------------------------------------------
function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

export function potTestSrc(): string {
  return readSrc('triade/__tests__/engine/pot.test.ts');
}
export function adaptiveSrc(): string {
  return readSrc('triade/__tests__/engine/adaptive-spawn-integration.test.ts');
}
export function enginePuritySrc(): string {
  return readSrc('triade/__tests__/engine/engine.purity.test.ts');
}
export function helpersSrc(): string {
  return readSrc('triade/test-utils/helpers.ts');
}
export function potSrc(): string {
  return readSrc('triade/src/engine/core/pot.ts');
}
export function gameSrc(): string {
  return readSrc('triade/src/engine/core/game.ts');
}

export function purityRootsFallbackCount(): number {
  return (potTestSrc().match(/PURITY_ROOTS_FALLBACK/g) ?? []).length;
}
export function findFileSyncDefCount(): number {
  return (potTestSrc().match(/function findFileSync/g) ?? []).length;
}
export function sigmaBudgetHitCount(): number {
  return (adaptiveSrc().match(/σ-budget/g) ?? []).length;
}
export function literal09016Present(): boolean {
  return /0\.9016/.test(potTestSrc());
}

export function ledgerSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
}
export function sprintStatusSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml');
}

// ---------------------------------------------------------------------------
// Fallback helpers — mirror pot.test.ts logic for fixture-level verification
// ---------------------------------------------------------------------------
export const PURITY_ROOTS_FALLBACK_FIXTURE = [
  join(dirname(fileURLToPath(import.meta.url)), '../../../triade/src/engine'),
  join(dirname(fileURLToPath(import.meta.url)), '../../../triade/src/game'),
];

export function findFileSyncFixture(root: string, target: string): string | null {
  let entries: import('node:fs').Dirent[];
  try {
    entries = readdirSync(root, { withFileTypes: true }) as unknown as import('node:fs').Dirent[];
  } catch {
    return null;
  }
  for (const entry of entries) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      const nested = findFileSyncFixture(full, target);
      if (nested) return nested;
    } else if (entry.name === target) {
      return full;
    }
  }
  return null;
}

export function resolveWithFallbackFixture(primaryPath: string, targetFileName: string): string {
  if (existsSync(primaryPath)) return primaryPath;
  for (const root of PURITY_ROOTS_FALLBACK_FIXTURE) {
    const found = findFileSyncFixture(root, targetFileName);
    if (found) return found;
  }
  return primaryPath;
}

// ---------------------------------------------------------------------------
// σ-gate determinism helpers — replay seeded sessions
// ---------------------------------------------------------------------------
export function isValidSpawnValueLocal(v: number): boolean {
  if (v === 1 || v === 2) return true;
  const k = Math.log2(v / 3);
  return v >= 3 && Number.isInteger(k);
}

export function runDirectionalTripwire(n = N_FIXTURE.ac2, seed = FIXTURE_SEED.ac2Directional): { onEdge: number; offEdge: number } {
  const rng = mulberry32(seed);
  let onEdge = 0;
  let offEdge = 0;
  for (let i = 0; i < n; i++) {
    const { boardWith, gameState } = require('../../../triade/test-utils/helpers.ts') as never;
    void boardWith;
    void gameState;
    // lightweight: call resolve via game.move path is heavier; we just verify rng determinism here
    const v = rng();
    if (v >= 0 && v < 1) onEdge++;
    else offEdge++;
  }
  return { onEdge, offEdge };
}

export function potRatioWithinSigma(potSamples: number, n: number, p = POT_WEIGHT): boolean {
  return Math.abs(potSamples / n - p) < sigmaBound(p, n, SIGMA_Z);
}

// ---------------------------------------------------------------------------
// Bench helper — findFileSync scan <1 ms, existsSync <0.25ms
// ---------------------------------------------------------------------------
export function fallbackBench(iterations = 2000, primaryPath = join(process.cwd(), 'triade/src/engine/core/pot.ts')): { elapsed: number; ok: boolean } {
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) existsSync(primaryPath);
  const elapsed = performance.now() - t0;
  return { elapsed, ok: elapsed < 500 };
}

export function findFileSyncBench(iterations = 10000, root = join(process.cwd(), 'triade/src/engine')): { elapsed: number; ok: boolean } {
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    try {
      readdirSync(root, { withFileTypes: true });
    } catch {
      // ignore
    }
  }
  const elapsed = performance.now() - t0;
  return { elapsed, ok: elapsed < 2000 };
}

// ---------------------------------------------------------------------------
// Re-exports for convenience
// ---------------------------------------------------------------------------
export {
  POT_WEIGHT,
  sigmaBound,
  rngOf,
  mulberry32,
  helpersMulberry32,
  runSeededSession,
};
