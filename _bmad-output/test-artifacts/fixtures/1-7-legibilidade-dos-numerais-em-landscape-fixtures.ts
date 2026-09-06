/**
 * TEA Automate — Fixtures for 1-7-legibilidade-dos-numerais-em-landscape
 * Location: _bmad-output/test-artifacts/fixtures/1-7-legibilidade-dos-numerais-em-landscape-fixtures.ts
 * Runner: host-only (imported by node:test + tsx specs under tests/unit|api|e2e).
 * TEA mapping: pure numeral/ink/layout/wiring contracts — no faker, no network,
 * no Playwright fixtures. Deterministic literals only (fixture-architecture.md
 * host adaptation: pure-data seam => literal tables + scan helpers).
 *
 * Sources of truth (shipped Story 1.7, final_revision 3e8a021):
 *   triade/src/ui/tileNumerals.ts  (tokens 32/13/9, MIN_TILE_WIDTH=44,
 *                                   FIT_INSET_FACTOR=0.5, ESTIMATED_WIDTH_FACTOR=0.55,
 *                                   E9 canonical 13-tier ink/fill + shape/contrast utils)
 *   triade/src/ui/layout.ts        (BOARD_SIZE_FLOOR=216, layoutFor clamp)
 *   triade/src/render/GameBoard.tsx (numeralSizeFor(value, cell) @201,
 *                                   tileTextColor -> tileInkFor @17-18,270)
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Gate constants (contract pins — change only with a story)
// ---------------------------------------------------------------------------

export const MIN_TILE_WIDTH_EXPECTED = 44;
export const BOARD_SIZE_FLOOR_EXPECTED = 216; // 44*4 + 8*2 + 8*3
export const FIT_INSET_FACTOR_EXPECTED = 0.5;
export const ESTIMATED_WIDTH_FACTOR_DOC = 0.55; // documented in module + tests

export const TOKEN_1_3 = { fontSize: 32, fontWeight: 800 } as const;
export const TOKEN_4_5 = { fontSize: 13, fontWeight: 700 } as const;
export const TOKEN_6_PLUS = { fontSize: 9, fontWeight: 700 } as const;

export const INK_DARK = '#1C1206';
export const INK_LIGHT = '#F6F0E1';

// Story-time 2-tier hexes — SUPERSEDED by E9 canonical. Listed here only so
// tests can assert the renderer/module NEVER regress to them (R-004).
export const SUPERSEDED_INK_HEXES = ['#3a2f1d', '#fff8e8'] as const;

// ---------------------------------------------------------------------------
// Deterministic case tables
// ---------------------------------------------------------------------------

export interface TokenCase {
  value: number;
  fontSize: number;
  fontWeight: number;
}

/** Digit-bucket boundaries incl. 3/4, 5/6 and 7-digit overflow. */
export const TOKEN_CASES: TokenCase[] = [
  { value: 1, ...TOKEN_1_3 },
  { value: 99, ...TOKEN_1_3 },
  { value: 999, ...TOKEN_1_3 },
  { value: 1000, ...TOKEN_4_5 },
  { value: 1536, ...TOKEN_4_5 },
  { value: 3072, ...TOKEN_4_5 },
  { value: 99999, ...TOKEN_4_5 },
  { value: 100000, ...TOKEN_6_PLUS },
  { value: 153600, ...TOKEN_6_PLUS },
  { value: 999999, ...TOKEN_6_PLUS },
  { value: 1000000, ...TOKEN_6_PLUS }, // 7-digit overflow stays in 6+ bucket
];

/** (value, tileWidth) pairs where the token is expected to fit. */
export const FITS_TRUE_CASES: Array<[number, number]> = [
  [99, 44], // 32*0.55*2 = 35.2 <= 43.5
  [999, 80],
  [1000, 30], // 13*0.55*4 = 28.6 <= 29.5 (review regression pin)
  [1536, 44],
  [3072, 44],
  [100000, 44], // 9*0.55*6 = 29.7 <= 43.5
];

/** (value, tileWidth) pairs where the token is expected NOT to fit. */
export const FITS_FALSE_CASES: Array<[number, number]> = [
  [100000, 20],
  [1000, 10],
  [1000, 25], // 28.6 > 24.5
  [999, 30], // 32*0.55*3 = 52.8 > 29.5
];

/** AC-3 risk point: 6-digit values that must stay >= 9pt at the 44pt floor. */
export const RISK_POINT_VALUES = [1536, 3072, 100000, 153600, 999999] as const;

/** E9 canonical ink per tier (renderer<->module agreement, R-004). */
export const INK_CASES: Array<{ value: number; ink: string }> = [
  { value: 1, ink: INK_DARK },
  { value: 2, ink: INK_DARK },
  { value: 3, ink: INK_DARK },
  { value: 6, ink: INK_DARK },
  { value: 12, ink: INK_DARK },
  { value: 24, ink: INK_LIGHT },
  { value: 48, ink: INK_LIGHT },
  { value: 96, ink: INK_LIGHT },
  { value: 192, ink: INK_DARK },
  { value: 384, ink: INK_LIGHT },
  { value: 768, ink: INK_LIGHT },
  { value: 1536, ink: INK_DARK },
  { value: 3072, ink: INK_DARK },
  { value: 6144, ink: INK_DARK }, // 3072+ cap
];

/** Typical landscape phone window (iPhone 844x390, notch + home). */
export const LANDSCAPE_PHONE = {
  width: 844,
  height: 390,
  insets: { top: 47, bottom: 34, left: 0, right: 0 },
} as const;

/** Degenerate container (below floor) — board must stay valid, sub-floor. */
export const DEGENERATE_CONTAINER = {
  width: 200,
  height: 160,
  insets: { top: 0, bottom: 0, left: 0, right: 0 },
} as const;

// ---------------------------------------------------------------------------
// Wiring scan strings (GameBoard single-source, R-004)
// ---------------------------------------------------------------------------

export const WIRING_SCANS = {
  fontSizeCall: 'numeralSizeFor(value, cell)',
  inkImport: 'tileInkFor',
  inkDelegation: 'return tileInkFor(value, theme)',
  inkCallSite: 'tileTextColor(value, theme)',
} as const;

/** Literal ink hexes that must NOT appear in GameBoard.tsx (single-source). */
export const FORBIDDEN_RENDERER_INK_LITERALS = ['#1C1206', '#F6F0E1', '#3a2f1d', '#fff8e8'] as const;

// ---------------------------------------------------------------------------
// Source-scan helpers (host adaptation of selector-resilience/static scans)
// ---------------------------------------------------------------------------

function repoRoot(): string {
  try {
    readFileSync(join(process.cwd(), 'triade/src/ui/tileNumerals.ts'), 'utf8');
    return process.cwd();
  } catch {
    return join(process.cwd(), '..');
  }
}

export function readSource(relPath: string): string {
  return readFileSync(join(repoRoot(), relPath), 'utf8');
}

export function countMatches(src: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let from = 0;
  for (;;) {
    const idx = src.indexOf(needle, from);
    if (idx === -1) return count;
    count += 1;
    from = idx + needle.length;
  }
}

/** Strip comments + string literals so literal scans don't false-positive. */
export function stripCommentsAndStrings(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:\\'"])\/\/.*$/gm, '$1 ')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

// ---------------------------------------------------------------------------
// Contract validation (called by gateway/umbrella specs)
// ---------------------------------------------------------------------------

export function assertNumeralTokensContract(mod: {
  TILE_NUMERAL_TOKENS: Record<string, { fontSize: number; fontWeight: number }>;
  MIN_TILE_WIDTH: number;
  FIT_INSET_FACTOR: number;
}): void {
  assert.deepStrictEqual(mod.TILE_NUMERAL_TOKENS['1-3'], { ...TOKEN_1_3 });
  assert.deepStrictEqual(mod.TILE_NUMERAL_TOKENS['4-5'], { ...TOKEN_4_5 });
  assert.deepStrictEqual(mod.TILE_NUMERAL_TOKENS['6+'], { ...TOKEN_6_PLUS });
  assert.strictEqual(mod.MIN_TILE_WIDTH, MIN_TILE_WIDTH_EXPECTED);
  assert.ok(mod.FIT_INSET_FACTOR > 0 && mod.FIT_INSET_FACTOR <= 1);
}

export function assertGameBoardWiringContract(src: string): void {
  const clean = stripCommentsAndStrings(src);
  assert.ok(
    clean.includes(WIRING_SCANS.fontSizeCall),
    `GameBoard must size fonts via ${WIRING_SCANS.fontSizeCall}`,
  );
  assert.ok(
    clean.includes(WIRING_SCANS.inkDelegation),
    'GameBoard tileTextColor must delegate to tileInkFor (single source)',
  );
  for (const literal of FORBIDDEN_RENDERER_INK_LITERALS) {
    assert.ok(
      !clean.includes(`'${literal}'`) && !clean.includes(`"${literal}"`),
      `GameBoard must not hardcode ink literal ${literal}`,
    );
  }
  for (const old of SUPERSEDED_INK_HEXES) {
    assert.ok(!src.includes(old), `superseded story-time ink ${old} must not reappear`);
  }
}
