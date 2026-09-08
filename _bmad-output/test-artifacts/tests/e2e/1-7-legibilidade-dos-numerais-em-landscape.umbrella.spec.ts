/**
 * TEA Automate — E2E Umbrella Journeys for 1-7-legibilidade-dos-numerais-em-landscape
 * Location: _bmad-output/test-artifacts/tests/e2e/1-7-legibilidade-dos-numerais-em-landscape.umbrella.spec.ts
 * Runner: node:test + tsx (host-only — RN Skia board has no Playwright harness;
 * per test-levels-framework.md the render pixel is a MANUAL gate, so journeys
 * are modeled analytically: layoutFor -> tile width -> numeralSizeFor +
 * tileInkFor, end to end across orientations).
 * TEA mapping: "E2E" = whole-journey composition (orientation -> board ->
 * tile -> numeral + ink). Critical happy path ONLY — no duplication with the
 * unit/gateway levels (selective-testing.md).
 *
 * Story: 1-7-legibilidade-dos-numerais-em-landscape (final_revision 3e8a021,
 * awaiting-operator, T3.2 manual owed). Test-design:
 * test-design/test-design-epic-1-7-legibilidade-dos-numerais-em-landscape.md
 * (R-001 score 6: real Skia render unproven until T3.2).
 *
 * Execute (from repo root):
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test \
 *     _bmad-output/test-artifacts/tests/e2e/1-7-legibilidade-dos-numerais-em-landscape.umbrella.spec.ts
 * Journey tests are ACTIVE and must PASS. The T3.2 manual gate documents the
 * operator session (the only path that can close R-001).
 * This file is the TEA artifact under test_artifacts/tests/e2e per _bmad/tea/config.yaml.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { numeralSizeFor, numeralFits, tileInkFor } from '../../../../triade/src/ui/tileNumerals.ts';
import { layoutFor, BOARD_SIZE_FLOOR } from '../../../../triade/src/ui/layout.ts';
import {
  LANDSCAPE_PHONE,
  BOARD_SIZE_FLOOR_EXPECTED,
  MIN_TILE_WIDTH_EXPECTED,
  INK_DARK,
  INK_LIGHT,
} from '../../fixtures/1-7-legibilidade-dos-numerais-em-landscape-fixtures.ts';

/** Derive the tile width the renderer sees from a laid-out board (GRID=4, padding 8, gap 8). */
function tileWidthForBoard(boardSize: number): number {
  return (boardSize - 8 * 2 - 8 * 3) / 4;
}

const PORTRAIT_PHONE = {
  width: 390,
  height: 844,
  insets: { top: 47, bottom: 34, left: 0, right: 0 },
} as const;

// ---------------------------------------------------------------------------
// P0 — Critical journeys (rotation + risk point, end to end)
// ---------------------------------------------------------------------------

describe('[E2E][P0] 1-7 landscape legibility journeys', () => {
  it('[P0] journey: rotate to landscape -> floor holds -> every tier legible (AC-1..AC-3)', () => {
    // Given a portrait phone rotated to the landscape window
    // When layout -> tile width -> numeral size + ink run end to end
    // Then tiles stay >= ~44pt and every digit tier resolves a legible fitting size
    const portrait = layoutFor(PORTRAIT_PHONE);
    assert.strictEqual(portrait.isLandscape, false);

    const landscape = layoutFor(LANDSCAPE_PHONE);
    assert.strictEqual(landscape.isLandscape, true);
    assert.ok(landscape.boardSize >= BOARD_SIZE_FLOOR_EXPECTED);

    const tile = tileWidthForBoard(landscape.boardSize);
    assert.ok(tile >= MIN_TILE_WIDTH_EXPECTED - 0.001, `tile ${tile} must hold the ~44pt floor`);

    const journey: Array<{ value: number; minSize: number; ink: string }> = [
      { value: 2, minSize: 32, ink: INK_DARK }, // 1-digit token fits exactly
      { value: 64, minSize: 32, ink: INK_LIGHT }, // 2-digit 35.2pt estimate fits
      { value: 1024, minSize: 13, ink: INK_LIGHT }, // 4-digit token fits exactly
      { value: 1536, minSize: 9, ink: INK_DARK }, // 6-digit risk point
      { value: 3072, minSize: 9, ink: INK_DARK }, // 6-digit risk point
    ];
    for (const leg of journey) {
      const size = numeralSizeFor(leg.value, tile);
      assert.ok(size >= leg.minSize, `value ${leg.value}: size ${size} must stay >= ${leg.minSize}`);
      assert.strictEqual(numeralFits(leg.value, tile), true, `value ${leg.value} must fit at ${tile}pt`);
      assert.strictEqual(tileInkFor(leg.value), leg.ink, `value ${leg.value}: ink`);
    }
  });

  it('[P0] journey: 3-digit scaling re-run at the derived tile never clips (AC-2)', () => {
    // Given a 3-digit value whose 32pt token exceeds the derived ~47pt tile
    // per the estimator (52.8 > tile - 0.5)
    // When the size check re-runs end to end
    // Then it scales below the token, stays finite-positive, and never clips
    const tile = tileWidthForBoard(layoutFor(LANDSCAPE_PHONE).boardSize);
    assert.strictEqual(numeralFits(512, tile), false);
    const size = numeralSizeFor(512, tile);
    assert.ok(size > 0 && size < 32, `512 at ${tile}pt must scale below 32pt, got ${size}`);
    assert.ok(size * 0.55 * 3 <= tile - 0.5 + 1e-9, 'scaled 3-digit must not clip');
  });

  it('[P0] journey: smallest landscape tile keeps token tiers, 3-digit scales cleanly (AC-3)', () => {
    // Given the smallest legal landscape tile (exactly the 44pt floor)
    // When each token tier renders at it
    // Then 1-2 digit -> 32pt, 4-5 digit -> 13pt, 6+ digit -> 9pt exactly, and
    // 3-digit (52.8pt estimate) scales below 32pt without clipping
    const tile = MIN_TILE_WIDTH_EXPECTED;
    assert.strictEqual(numeralSizeFor(99, tile), 32);
    assert.strictEqual(numeralSizeFor(9999, tile), 13);
    assert.strictEqual(numeralSizeFor(999999, tile), 9);
    assert.strictEqual(numeralFits(99, tile), true);
    assert.strictEqual(numeralFits(9999, tile), true);
    assert.strictEqual(numeralFits(999999, tile), true);
    const scaled3 = numeralSizeFor(999, tile);
    assert.ok(scaled3 > 0 && scaled3 < 32, `999 at 44pt must scale below 32pt, got ${scaled3}`);
    assert.ok(scaled3 * 0.55 * 3 <= tile - 0.5 + 1e-9, 'scaled 3-digit must not clip');
  });
});

// ---------------------------------------------------------------------------
// P1 — Fallback journey (sub-floor composition, AC-1 re-run path)
// ---------------------------------------------------------------------------

describe('[E2E][P1] 1-7 sub-floor fallback journey', () => {
  it('[P1] journey: cramped container -> sub-floor board -> scaling fallback, never clips', () => {
    // Given a container too small for the 216 floor
    // When layout shrinks below the floor and numerals re-run the check
    // Then every tier still resolves a finite-positive largest-fitting size
    const cramped = layoutFor({
      width: 300,
      height: 220,
      insets: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    assert.ok(cramped.boardSize < BOARD_SIZE_FLOOR);
    assert.ok(cramped.boardSize > 0);
    const tile = tileWidthForBoard(cramped.boardSize);
    for (const v of [8, 1024, 3072, 100000]) {
      const size = numeralSizeFor(v, tile);
      assert.ok(Number.isFinite(size) && size > 0, `value ${v}: fallback size finite-positive`);
      assert.ok(size * 0.55 * String(v).length <= tile - 0.5 + 1e-9, `value ${v}: never clips`);
    }
  });
});

// ---------------------------------------------------------------------------
// P1 — Manual gate (T3.2): the only path that closes R-001
// ---------------------------------------------------------------------------

describe('[E2E][P1] 1-7 manual render gate (T3.2, HUMAN-ONLY)', () => {
  it('[P1][MANUAL] T3.2 operator session: rotate simulator/device, confirm tiers legible', () => {
    // Given a dev build on simulator + one physical device (project rule:
    // device checks are informative, never a PR gate)
    // When the operator (1) rotates to landscape, (2) confirms 32pt (1-3
    // digits), 13pt (4-5), 9pt 6-digit (1536/3072+) legible at the smallest
    // tile, (3) confirms tiles >= ~44pt with no clipping, (4) confirms
    // max-Dynamic-Type legibility (AC-4 exception, UX-DR-18)
    // Then evidence is recorded in the story completion note and 1.7 closes.
    // This test documents the gate — it cannot execute the render itself.
    // Owner: Eduardo. Story stays awaiting-operator until recorded.
    assert.ok(
      BOARD_SIZE_FLOOR === BOARD_SIZE_FLOOR_EXPECTED,
      'manual gate precondition: analytic contract green (else fix code first)',
    );
  });
});
