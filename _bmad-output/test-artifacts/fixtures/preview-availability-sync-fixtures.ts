// TEA Automate — Fixture helpers for dw-preview-availability-sync (DW-114)
// Deterministic, no @faker-js/faker — ladder values are PO-pinned constants
// (POT_LADDER_DELAY=2), not random data. Host-only: node:test + tsx, no
// RN/Reanimated/Skia mount, no Playwright browser (no page.goto anywhere).
// Spec: _bmad-output/implementation-artifacts/spec-preview-availability-sync.md
//   (test-only sync of stale AC4/AC5 expectations to the delay-2 ladder;
//   production mapping untouched — commit 1617827 touches only the integration test)
// Test-design: _bmad-output/test-artifacts/test-design/test-design-dw-preview-availability-sync.md
//   (7 risks, 1 high residual R-002 vacuous AC4 guards; 6 P0 + 2 P1 + 4 P2 + 3 P3)
// ATDD (dormant RED scaffolds, test.skip — NOT duplicated here):
//   _bmad-output/test-artifacts/tests/unit/preview-availability-sync.atdd.test.ts (8 skip)
//   _bmad-output/test-artifacts/tests/api/preview-availability-sync.gateway.spec.ts (6 skip)
//   _bmad-output/test-artifacts/tests/e2e/preview-availability-sync.umbrella.spec.ts (5 skip)
// Automate (this run — executable GREEN verification + shared fixtures):
//   _bmad-output/test-artifacts/fixtures/preview-availability-sync-fixtures.ts (this file)
//   _bmad-output/test-artifacts/tests/api/preview-availability-sync.automate.spec.ts
//   _bmad-output/test-artifacts/tests/e2e/preview-availability-sync.automate.umbrella.spec.ts

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ceilingDetector,
  tierForCeiling,
  potForTier,
} from '../../../triade/src/engine/core/index.ts';
import type { Board, PendingSpawn } from '../../../triade/src/engine/core/index.ts';
import { previewFor } from '../../../triade/src/game/preview.ts';

// ---------------------------------------------------------------------------
// Delay-2 ladder truth table (PO intent 2026-09-04, pinned independently by
// triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts). Tiers 0-2 collapse
// to [3]; 6 unlocks at ceiling 192 (tier 3), 12 at 384 (tier 4), 24 at 768.
// ---------------------------------------------------------------------------
export const DELAY2_LADDER: ReadonlyArray<{ ceiling: number; expected: readonly number[] }> = Object.freeze([
  { ceiling: 24, expected: Object.freeze([3]) },
  { ceiling: 48, expected: Object.freeze([3]) },
  { ceiling: 96, expected: Object.freeze([3]) },
  { ceiling: 192, expected: Object.freeze([3, 6]) },
  { ceiling: 384, expected: Object.freeze([3, 6, 12]) },
  { ceiling: 768, expected: Object.freeze([3, 6, 12, 24]) },
]);

export const AC4_SLICES: ReadonlyArray<{ ceiling: number; value: number; expected: readonly number[] }> = Object.freeze([
  { ceiling: 192, value: 3, expected: Object.freeze([3, 6]) },
  { ceiling: 384, value: 6, expected: Object.freeze([6, 12]) },
  { ceiling: 768, value: 6, expected: Object.freeze([6, 12, 24]) },
]);

export const POT_LADDER_DELAY_PIN = 2;

// ---------------------------------------------------------------------------
// Board helpers — mirror the target integration file + App.tsx wiring
// (previewForBoard = potForTier(tierForCeiling(ceilingDetector(board))));
// the spawnable pot set is derived ONCE from the live board ceiling.
// ---------------------------------------------------------------------------
export function boardWithCeiling(max: number): Board {
  const empty: Board = Array.from({ length: 4 }, () => Array<number | null>(4).fill(2));
  empty[0][0] = max;
  return empty;
}

export function pending(value: number, displayRoll: number): PendingSpawn {
  return { value, displayRoll };
}

export function previewForBoard(board: Board, pendingSpawn: PendingSpawn) {
  const availablePot = potForTier(tierForCeiling(ceilingDetector(board)));
  return { availablePot, preview: previewFor(pendingSpawn, availablePot) };
}

// ---------------------------------------------------------------------------
// Source-scan helpers — repo-root aware (run from repo root OR triade/).
// ---------------------------------------------------------------------------
function readSrc(rel: string): string {
  const candidates = [join(process.cwd(), rel), join(process.cwd(), '..', rel)];
  for (const p of candidates) {
    try {
      return readFileSync(p, 'utf8');
    } catch {
      // try next
    }
  }
  throw new Error(`preview-availability-sync fixture: cannot read ${rel} from ${process.cwd()}`);
}

export function targetIntegrationSrc(): string {
  return readSrc('triade/__tests__/integration/preview-availability.integration.test.ts');
}
export function potSrc(): string {
  return readSrc('triade/src/engine/core/pot.ts');
}
export function ceilingSrc(): string {
  return readSrc('triade/src/engine/core/ceiling.ts');
}
export function previewSrc(): string {
  return readSrc('triade/src/game/preview.ts');
}
export function anchorSrc(): string {
  return readSrc('triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts');
}
export function specSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/spec-preview-availability-sync.md');
}
export function ledgerSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
}
export function progressSrc(): string {
  return readSrc('_bmad-output/test-artifacts/test-design-progress.md');
}

export function conditionalRangeGuardCount(src: string): number {
  return (src.match(/if \(\w+\.kind === 'range'\)/g) ?? []).length;
}

// ---------------------------------------------------------------------------
// Re-exports for convenience
// ---------------------------------------------------------------------------
export { ceilingDetector, tierForCeiling, potForTier, previewFor };
