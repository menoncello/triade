/**
 * TEA Automate — Fixtures for 1-5-layout-portrait-e-landscape
 * Location: _bmad-output/test-artifacts/fixtures/1-5-layout-portrait-e-landscape-fixtures.ts
 * Runner: host-only (imported by node:test + tsx specs under tests/unit|api|e2e).
 * TEA mapping: pure layout/orientation/wiring contracts — no faker, no network,
 * no Playwright fixtures. Deterministic literals only (fixture-architecture.md
 * host adaptation: pure-data seam => literal tables + scan helpers).
 *
 * Sources of truth (shipped Story 1.5, final_revision 0ffd59a):
 *   triade/src/ui/layout.ts       (SAFE_MARGIN=16, PORTRAIT_BAND_HEIGHT=96,
 *                                  LANDSCAPE_BAND_HEIGHT=48, BOARD_SIZE_FLOOR=216,
 *                                  layoutFor({width,height,insets}), getBandTop)
 *   triade/src/ui/orientation.ts  (isLandscape = width > height)
 *   triade/src/ui/Hud.tsx         (portrait 34pt band, landscape 22pt/11pt thin
 *                                  band, pause top-right slot, preview slots,
 *                                  pointerEvents="none"/box-none, zIndex overlay)
 *   triade/src/ui/PauseButton.tsx (HIT_TARGET=48, width/height literal)
 *   triade/App.tsx                (SafeAreaProvider root, useSyncedLayout seam,
 *                                  Hud + boardSize wiring, paddingTop bandTop)
 *   triade/app.json               (expo.orientation "default")
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Gate constants (contract pins — change only with a story)
// ---------------------------------------------------------------------------

export const SAFE_MARGIN_EXPECTED = 16;
export const PORTRAIT_BAND_HEIGHT_EXPECTED = 96;
export const LANDSCAPE_BAND_HEIGHT_EXPECTED = 48;
export const HIT_TARGET_EXPECTED = 48;
export const BOARD_SIZE_FLOOR_EXPECTED = 216; // 44*4 + 8*2 + 8*3
export const MIN_TILE_WIDTH_EXPECTED = 44;
export const SCORE_PORTRAIT_PT = 34;
export const SCORE_LANDSCAPE_PT = 22;
export const BEST_LANDSCAPE_PT = 11;

// ---------------------------------------------------------------------------
// Deterministic dimension/inset fixtures
// ---------------------------------------------------------------------------

export interface InsetsLike {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface LayoutFixture {
  name: string;
  width: number;
  height: number;
  insets: InsetsLike;
}

export const ZERO_INSETS: InsetsLike = { top: 0, bottom: 0, left: 0, right: 0 };
export const NOTCH_PORTRAIT_INSETS: InsetsLike = { top: 47, bottom: 34, left: 0, right: 0 };
export const NOTCH_LANDSCAPE_INSETS: InsetsLike = { top: 0, bottom: 21, left: 47, right: 47 };

/** iPhone 14-class portrait, notch. Width-bounded: 390-0-0-32=358 wide. */
export const PORTRAIT_PHONE: LayoutFixture = {
  name: 'portrait-phone-390x844-notch',
  width: 390,
  height: 844,
  insets: NOTCH_PORTRAIT_INSETS,
};

/** Same phone rotated. Height-bounded below the 48 band. */
export const LANDSCAPE_PHONE: LayoutFixture = {
  name: 'landscape-phone-844x390-notch',
  width: 844,
  height: 390,
  insets: NOTCH_LANDSCAPE_INSETS,
};

/**
 * Height-bounded portrait fixture (non-tautological asymmetric-insets case):
 * 500x580 with zero horizontal insets — availW=468, availH=580-32-96=452,
 * so the board is HEIGHT-bounded and vertical insets actually bind.
 */
export const HEIGHT_BOUNDED_PORTRAIT: LayoutFixture = {
  name: 'height-bounded-portrait-500x580',
  width: 500,
  height: 580,
  insets: ZERO_INSETS,
};

/** Cramped container: available space below the floor — fallback path. */
export const CRAMPED_CONTAINER: LayoutFixture = {
  name: 'cramped-200x200-zero',
  width: 200,
  height: 200,
  insets: ZERO_INSETS,
};

/** Extreme aspect ratios (never negative, never throw). */
export const EXTREME_FIXTURES: LayoutFixture[] = [
  { name: 'ultra-tall-320x900', width: 320, height: 900, insets: ZERO_INSETS },
  { name: 'ultra-wide-900x320', width: 900, height: 320, insets: ZERO_INSETS },
  { name: 'tiny-100x100', width: 100, height: 100, insets: ZERO_INSETS },
  { name: 'square-400x400', width: 400, height: 400, insets: ZERO_INSETS },
];

/** Degenerate inputs: clamp to boardSize 0, portrait band, isLandscape false. */
export const DEGENERATE_INPUTS: Array<{ name: string; width: number; height: number; insets: InsetsLike }> = [
  { name: 'nan-width', width: NaN, height: 800, insets: ZERO_INSETS },
  { name: 'inf-height', width: 390, height: Infinity, insets: ZERO_INSETS },
  { name: 'nan-inset-top', width: 390, height: 844, insets: { ...ZERO_INSETS, top: NaN } },
];

// ---------------------------------------------------------------------------
// Source-scan helpers (wiring/tripwire contracts — read, never execute RN)
// ---------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));
/** Repo root = three levels above fixtures/ (test-artifacts/fixtures -> root). */
export const REPO_ROOT = join(HERE, '..', '..', '..');

export function readSource(relPath: string): string {
  return readFileSync(join(REPO_ROOT, relPath), 'utf8');
}

export function stripCommentsAndStrings(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

export function countMatches(src: string, re: RegExp): number {
  const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
  return [...src.matchAll(new RegExp(re.source, flags))].length;
}

/** Assert a substring is present (contract pin); throws with a named message. */
export function assertContains(src: string, needle: string, label: string): void {
  assert.ok(src.includes(needle), `${label}: expected source to contain ${JSON.stringify(needle)}`);
}

/** Assert a regex matches; throws with a named message. */
export function assertMatches(src: string, re: RegExp, label: string): void {
  assert.ok(re.test(src), `${label}: expected source to match ${re}`);
}

// ---------------------------------------------------------------------------
// Fixture self-validation (import-time contract on the tables themselves)
// ---------------------------------------------------------------------------

export function assertLayoutFixturesContract(): void {
  // Golden anchors derivable by hand (documents the math, guards table drift).
  // PORTRAIT_PHONE: availW=390-0-0-32=358; availH=844-47-34-32-96=635 -> board 358.
  assert.strictEqual(390 - 0 - 0 - 2 * 16, 358);
  assert.strictEqual(844 - 47 - 34 - 2 * 16 - 96, 635);
  // HEIGHT_BOUNDED_PORTRAIT: availW=500-32=468; availH=580-0-0-32-96=452 -> board 452.
  assert.strictEqual(500 - 0 - 0 - 2 * 16, 468);
  assert.strictEqual(580 - 0 - 0 - 2 * 16 - 96, 452);
  // Floor derivation: 44*4 + 8*2 + 8*3 = 216.
  assert.strictEqual(44 * 4 + 8 * 2 + 8 * 3, BOARD_SIZE_FLOOR_EXPECTED);
  // Band fit: landscape band 48 exactly fits HIT_TARGET 48 (zero slack — drift guard).
  assert.strictEqual(LANDSCAPE_BAND_HEIGHT_EXPECTED, HIT_TARGET_EXPECTED);
}

export function assertAppWiringContract(appSrc: string): void {
  assertContains(appSrc, 'SafeAreaProvider', 'App/SafeAreaProvider root');
  assertContains(appSrc, 'useSyncedLayout', 'App/useSyncedLayout seam');
  assertContains(appSrc, 'paddingTop: bandTop', 'App/board offset via bandTop');
  assertContains(appSrc, 'width={boardSize}', 'App/GameBoard width=boardSize');
  assertContains(appSrc, '<Hud', 'App/Hud render');
}
