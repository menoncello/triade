/**
 * TEA Automate — API Gateway Contract Tests for 1-7-legibilidade-dos-numerais-em-landscape
 * Location: _bmad-output/test-artifacts/tests/api/1-7-legibilidade-dos-numerais-em-landscape.gateway.spec.ts
 * Runner: node:test + tsx (host-only, no Playwright request fixture needed)
 * TEA mapping: "API" = pure-module gateway contract (tileNumerals/layout public
 * surface + GameBoard wiring scans). Provider is triade/src/ui/tileNumerals.ts +
 * triade/src/ui/layout.ts + triade/src/render/GameBoard.tsx; consumer is the
 * Skia AnimatedTile renderer + layout band composition.
 * This file mirrors _bmad-output/test-artifacts/tests/api/* expectations from
 * TEA's api-testing-patterns, adapted for the pure-TS numeral seam.
 *
 * Story: 1-7-legibilidade-dos-numerais-em-landscape (final_revision 3e8a021,
 * awaiting-operator, T3.2 manual owed). Test-design:
 * test-design/test-design-epic-1-7-legibilidade-dos-numerais-em-landscape.md
 * (8 risks, 1 high R-001; P0 12 / P1 6 / P2 4 / P3 2).
 * ATDD source: atdd-1-7-numeral-legibility.red.test.ts (11 scaffolds, skipped).
 *
 * Execute (from repo root):
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test \
 *     _bmad-output/test-artifacts/tests/api/1-7-legibilidade-dos-numerais-em-landscape.gateway.spec.ts
 * All tests below are ACTIVE and must PASS against the shipped state.
 * This file is the TEA artifact under test_artifacts/tests/api per _bmad/tea/config.yaml.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertNumeralTokensContract,
  assertGameBoardWiringContract,
  readSource,
  countMatches,
  stripCommentsAndStrings,
  LANDSCAPE_PHONE,
  BOARD_SIZE_FLOOR_EXPECTED,
  MIN_TILE_WIDTH_EXPECTED,
  INK_DARK,
  INK_LIGHT,
} from '../../fixtures/1-7-legibilidade-dos-numerais-em-landscape-fixtures.ts';
import * as numerals from '../../../../triade/src/ui/tileNumerals.ts';
import * as layout from '../../../../triade/src/ui/layout.ts';

// ---------------------------------------------------------------------------
// P0 — Gateway: module surface contract (provider endpoints)
// ---------------------------------------------------------------------------

describe('[API][P0] 1-7 numeral gateway — module surface', () => {
  it('[P0] tileNumerals exports the full AC-1..AC-3 surface (R-004)', () => {
    // Given the shipped tileNumerals provider module
    // When its public surface is inspected
    // Then every function/constant the renderer + layout depend on exists
    for (const key of [
      'TILE_NUMERAL_TOKENS',
      'MIN_TILE_WIDTH',
      'FIT_INSET_FACTOR',
      'numeralTokenFor',
      'numeralFits',
      'numeralSizeFor',
      'tileInkFor',
      'tileFillFor',
    ]) {
      assert.ok(key in numerals, `tileNumerals must export ${key}`);
    }
    assertNumeralTokensContract(numerals);
  });

  it('[P0] layout exports the AC-1 floor surface (R-003)', () => {
    // Given the shipped layout provider module
    // When its public surface is inspected
    // Then BOARD_SIZE_FLOOR + layoutFor exist and the floor is 216
    assert.ok('BOARD_SIZE_FLOOR' in layout, 'layout must export BOARD_SIZE_FLOOR');
    assert.ok('layoutFor' in layout, 'layout must export layoutFor');
    assert.strictEqual(layout.BOARD_SIZE_FLOOR, BOARD_SIZE_FLOOR_EXPECTED);
  });

  it('[P0] gateway round-trip: token -> fits -> size agrees at the floor (AC-2/AC-3)', () => {
    // Given the 4-digit and 6-digit tokens at the 44pt floor tile
    // When the full gateway path (tokenFor + fits + sizeFor) runs
    // Then 1000 resolves 13pt fitting, 100000 resolves 9pt fitting
    assert.deepStrictEqual(numerals.numeralTokenFor(1000), { fontSize: 13, fontWeight: 700 });
    assert.strictEqual(numerals.numeralFits(1000, MIN_TILE_WIDTH_EXPECTED), true);
    assert.strictEqual(numerals.numeralSizeFor(1000, MIN_TILE_WIDTH_EXPECTED), 13);
    assert.deepStrictEqual(numerals.numeralTokenFor(100000), { fontSize: 9, fontWeight: 700 });
    assert.strictEqual(numerals.numeralFits(100000, MIN_TILE_WIDTH_EXPECTED), true);
    assert.strictEqual(numerals.numeralSizeFor(100000, MIN_TILE_WIDTH_EXPECTED), 9);
  });

  it('[P0] ink gateway: dark/light boundary incl. incandescent tiers (AC-2 ink re-run)', () => {
    // Given the ink boundary the renderer consumes per tile
    // When tileInkFor resolves the boundary tiers
    // Then dark/light split holds incl. 1536/3072 dark (E9 canonical)
    assert.strictEqual(numerals.tileInkFor(12), INK_DARK);
    assert.strictEqual(numerals.tileInkFor(24), INK_LIGHT);
    assert.strictEqual(numerals.tileInkFor(1536), INK_DARK);
    assert.strictEqual(numerals.tileInkFor(3072), INK_DARK);
  });

  it('[P0] layout gateway: landscape phone keeps board >= floor (AC-1)', () => {
    // Given the typical landscape phone window
    // When layoutFor runs through the gateway
    // Then the board stays >= floor and reports landscape
    const result = layout.layoutFor(LANDSCAPE_PHONE);
    assert.strictEqual(result.isLandscape, true);
    assert.ok(result.boardSize >= BOARD_SIZE_FLOOR_EXPECTED);
  });
});

// ---------------------------------------------------------------------------
// P1 — Gateway: renderer wiring contract (consumer agreement, R-004)
// ---------------------------------------------------------------------------

describe('[API][P1] 1-7 wiring gateway — GameBoard single-source', () => {
  it('[P1] GameBoard sizes fonts via numeralSizeFor + inks via tileInkFor (R-004)', () => {
    // Given the shipped GameBoard consumer
    // When its source is scanned (comments/strings stripped)
    // Then font sizing + ink both route through the pure module (no literals)
    const src = readSource('triade/src/render/GameBoard.tsx');
    assertGameBoardWiringContract(src);
  });

  it('[P1] layout imports the floor from tileNumerals (single source, R-003)', () => {
    // Given the layout module source
    // When its import block is inspected
    // Then MIN_TILE_WIDTH comes from tileNumerals (never a local duplicate)
    const src = readSource('triade/src/ui/layout.ts');
    const clean = stripCommentsAndStrings(src);
    assert.ok(
      clean.includes('MIN_TILE_WIDTH'),
      'layout must reference MIN_TILE_WIDTH from tileNumerals',
    );
    assert.strictEqual(countMatches(src, 'const MIN_TILE_WIDTH'), 0);
    assert.strictEqual(countMatches(src, 'MIN_TILE_WIDTH = 44'), 0);
  });

  it('[P1] purity gateway: tileNumerals imports no RN/React/Skia/Expo (project-context)', () => {
    // Given the engine-purity rule (src/ui pure modules scanned by ui.purity.test.ts)
    // When tileNumerals source imports are scanned
    // Then no RN/React/Skia/Expo import exists
    const src = readSource('triade/src/ui/tileNumerals.ts');
    const importLines = src.split('\n').filter((line) => /^\s*import[\s(]/.test(line));
    for (const banned of ['react-native', 'react', '@shopify/react-native-skia', 'expo']) {
      const hit = importLines.some((line) =>
        new RegExp(`from\\s+['"][^'"]*${banned.replace(/[/@-]/g, '\\$&')}[^'"]*['"]`).test(line),
      );
      assert.ok(!hit, `tileNumerals must not import ${banned}`);
    }
  });
});

// ---------------------------------------------------------------------------
// P2 — Gateway: hardening monitors (estimator + theme seam)
// ---------------------------------------------------------------------------

describe('[API][P2] 1-7 gateway hardening monitors', () => {
  it('[P2] estimator factor + inset budget documented in module (R-002 guard)', () => {
    // Given the documented ~10% sub-floor optimism (accepted by design)
    // When the module source is scanned
    // Then the calibration note + named constants are present (recalibration tripwire)
    const src = readSource('triade/src/ui/tileNumerals.ts');
    assert.ok(src.includes('ESTIMATED_WIDTH_FACTOR'), 'estimator factor must stay a named constant');
    assert.ok(src.includes('FIT_INSET_FACTOR'), 'inset budget must stay a named constant');
  });

  it('[P2] theme seam intact: wrappers accept themeId and fall back to dark (R-004)', () => {
    // Given the E9 theme seam on the ink/fill wrappers
    // When called with and without a theme
    // Then themed + unthemed paths agree for dark and stay well-formed otherwise
    assert.strictEqual(numerals.tileInkFor(3, 'dark'), numerals.tileInkFor(3));
    assert.strictEqual(numerals.tileFillFor(3, 'dark'), numerals.tileFillFor(3));
    for (const theme of ['dark', 'light', 'colorBlind']) {
      const ink = numerals.tileInkFor(3072, theme);
      assert.ok(ink.startsWith('#') && ink.length === 7, `${theme}: ink well-formed`);
    }
  });
});
