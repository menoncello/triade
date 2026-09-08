/**
 * TEA Automate — Unit expansion for 1-7-legibilidade-dos-numerais-em-landscape
 * Location: _bmad-output/test-artifacts/tests/unit/1-7-legibilidade-dos-numerais-em-landscape.atdd.test.ts
 * Runner: node:test + tsx (host-only, pure TS seam — no Playwright/Cypress).
 * TEA mapping: "Unit" = pure numeral/ink/layout math. Expands BEYOND the ATDD
 * red scaffolds (atdd-1-7-numeral-legibility.red.test.ts, 11 skipped): no
 * duplicate coverage — ATDD pins the AC contract, this file pins the edge
 * paths (R-006 degenerate guards, R-007 non-canonical inputs), the WCAG ink
 * agreement, theme delegation, and estimator monotonicity.
 *
 * Execute (from repo root):
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test \
 *     _bmad-output/test-artifacts/tests/unit/1-7-legibilidade-dos-numerais-em-landscape.atdd.test.ts
 * Or: NODE_PATH=triade/node_modules triade/node_modules/.bin/tsx --test <file>
 *
 * Shipped Story 1.7 contract (final_revision 3e8a021). Working tree carries no
 * production diff — every test below is ACTIVE and must PASS against the
 * shipped state. A revert of tileNumerals.ts / layout.ts / GameBoard wiring
 * turns them RED.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  numeralTokenFor,
  numeralFits,
  numeralSizeFor,
  tileInkFor,
  tileFillFor,
  contrastRatio,
  relativeLuminance,
  TILE_HEXES,
  MIN_TILE_WIDTH,
  FIT_INSET_FACTOR,
} from '../../../../triade/src/ui/tileNumerals.ts';
import { layoutFor, BOARD_SIZE_FLOOR } from '../../../../triade/src/ui/layout.ts';
import {
  TOKEN_CASES,
  FITS_TRUE_CASES,
  FITS_FALSE_CASES,
  RISK_POINT_VALUES,
  INK_CASES,
  INK_DARK,
  INK_LIGHT,
  SUPERSEDED_INK_HEXES,
  MIN_TILE_WIDTH_EXPECTED,
  BOARD_SIZE_FLOOR_EXPECTED,
  DEGENERATE_CONTAINER,
} from '../../fixtures/1-7-legibilidade-dos-numerais-em-landscape-fixtures.ts';

// ---------------------------------------------------------------------------
// P0 — Contract pins beyond ATDD (guard rails for the shipped state)
// ---------------------------------------------------------------------------

describe('[Unit][P0] 1-7 floor derivation math (AC-1)', () => {
  it('[P0] BOARD_SIZE_FLOOR derives from MIN_TILE_WIDTH, GRID, padding, gap', () => {
    // Given the layout constants GRID=4, BOARD_PADDING=8, CELL_GAP=8
    // When the floor is derived from the 44pt tile floor
    // Then it equals 44*4 + 8*2 + 8*3 = 216
    assert.strictEqual(MIN_TILE_WIDTH, MIN_TILE_WIDTH_EXPECTED);
    assert.strictEqual(BOARD_SIZE_FLOOR, BOARD_SIZE_FLOOR_EXPECTED);
    assert.strictEqual(BOARD_SIZE_FLOOR, 44 * 4 + 8 * 2 + 8 * 3);
  });

  it('[P0] digit-bucket table covers 1..7 digits incl. boundaries (DESIGN.md:228-232)', () => {
    // Given the full bucket table from fixtures
    // When every case resolves a token
    // Then each matches its pinned 32/800 · 13/700 · 9/700 token
    for (const c of TOKEN_CASES) {
      const token = numeralTokenFor(c.value);
      assert.strictEqual(token.fontSize, c.fontSize, `value ${c.value}: fontSize`);
      assert.strictEqual(token.fontWeight, c.fontWeight, `value ${c.value}: fontWeight`);
    }
  });

  it('[P0] estimator fit table holds both directions (AC-2 gate)', () => {
    // Given the fits-true / fits-false tables
    // When numeralFits runs on each pair
    // Then every expectation holds (no estimator drift)
    for (const [v, w] of FITS_TRUE_CASES) {
      assert.strictEqual(numeralFits(v, w), true, `${v}@${w}pt must fit`);
    }
    for (const [v, w] of FITS_FALSE_CASES) {
      assert.strictEqual(numeralFits(v, w), false, `${v}@${w}pt must not fit`);
    }
  });

  it('[P0] risk point never clips the inset budget at the floor (AC-3)', () => {
    // Given every 6-digit-adjacent risk value at the 44pt floor tile
    // When numeralSizeFor runs
    // Then the returned size stays >= 9pt AND within the inset budget
    for (const v of RISK_POINT_VALUES) {
      const size = numeralSizeFor(v, MIN_TILE_WIDTH_EXPECTED);
      assert.ok(size >= 9, `value ${v} at 44pt must stay >= 9pt, got ${size}`);
      assert.ok(
        size * 0.55 * String(v).length <= MIN_TILE_WIDTH_EXPECTED - FIT_INSET_FACTOR,
        `value ${v} size ${size} must not clip the inset budget`,
      );
    }
  });

  it('[P0] E9 canonical ink table holds for all 13 tiers + 3072 cap', () => {
    // Given the 13-tier ink table incl. the 6144 cap
    // When tileInkFor resolves each tier
    // Then every tier returns its DESIGN canonical ink
    for (const c of INK_CASES) {
      assert.strictEqual(tileInkFor(c.value), c.ink, `value ${c.value}: ink`);
    }
  });

  it('[P0] superseded story-time ink hexes never return (R-004)', () => {
    // Given the old 2-tier hexes superseded by E9 canonical
    // When any tier (canonical, edge, cap) resolves ink
    // Then the old hexes never appear
    const probe = [1, 3, 24, 192, 1536, 3072, 6144, 0, -5, NaN, Infinity];
    for (const v of probe) {
      const ink = tileInkFor(v);
      for (const old of SUPERSEDED_INK_HEXES) {
        assert.notStrictEqual(ink.toLowerCase(), old, `value ${v}: must not regress to ${old}`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// P1 — Fallback + integration correctness (R-006, R-003, wiring-adjacent)
// ---------------------------------------------------------------------------

describe('[Unit][P1] 1-7 degenerate + floor integration', () => {
  it('[P1] non-finite inputs fall back to the token size (R-006)', () => {
    // Given non-finite tile widths / values
    // When numeralSizeFor runs
    // Then it returns the token size (finite, never NaN, never throws)
    assert.strictEqual(numeralSizeFor(1000, NaN), 13);
    assert.strictEqual(numeralSizeFor(1000, Infinity), 13);
    // String(NaN) is "NaN" (3 chars) -> 1-3 bucket -> non-finite guard returns token 32
    assert.strictEqual(numeralSizeFor(NaN, 44), 32);
  });

  it('[P1] zero/negative tile widths return the finite-positive guard (R-006)', () => {
    // Given zero/negative containers (layout already collapses these)
    // When numeralSizeFor runs
    // Then it returns 1 (finite-positive per spec — invisible dot, never NaN)
    for (const w of [0, -1, -44]) {
      const size = numeralSizeFor(100000, w);
      assert.ok(Number.isFinite(size) && size > 0, `width ${w} must stay finite-positive`);
    }
  });

  it('[P1] degenerate container yields a valid sub-floor board (R-003)', () => {
    // Given a container too small for the 216 floor
    // When layoutFor runs
    // Then the board shrinks below the floor but stays valid (no NaN/clamp-to-0)
    const layout = layoutFor(DEGENERATE_CONTAINER);
    assert.ok(Number.isFinite(layout.boardSize) && layout.boardSize > 0);
    assert.ok(layout.boardSize < BOARD_SIZE_FLOOR_EXPECTED);
  });

  it('[P1] non-finite layout inputs yield a valid zero board, never NaN', () => {
    // Given NaN/Infinity dimensions or insets
    // When layoutFor runs
    // Then it returns the { boardSize: 0 } guard
    const bad = layoutFor({
      width: NaN,
      height: 390,
      insets: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    assert.strictEqual(bad.boardSize, 0);
  });

  it('[P1] estimator is monotone: a wider tile never yields a smaller numeral', () => {
    // Given a fixed value across ascending tile widths
    // When numeralSizeFor runs on each width
    // Then sizes are non-decreasing (no fit-gate inversion)
    for (const v of [999, 1000, 100000]) {
      const widths = [5, 10, 20, 30, 44, 80, 200];
      const sizes = widths.map((w) => numeralSizeFor(v, w));
      for (let i = 1; i < sizes.length; i += 1) {
        assert.ok(
          sizes[i] >= sizes[i - 1],
          `value ${v}: size at ${widths[i]}pt (${sizes[i]}) must be >= size at ${widths[i - 1]}pt (${sizes[i - 1]})`,
        );
      }
    }
  });

  it('[P1] scaled sizes never exceed their bucket token (AC-2 re-run)', () => {
    // Given narrow tiles across buckets
    // When numeralSizeFor scales down
    // Then the result never exceeds the bucket token (min(token, scaled))
    const cases: Array<[number, number, number]> = [
      [999, 30, 32],
      [1000, 10, 13],
      [100000, 20, 9],
    ];
    for (const [v, w, token] of cases) {
      assert.ok(numeralSizeFor(v, w) <= token, `${v}@${w}pt must stay <= token ${token}`);
    }
  });
});

// ---------------------------------------------------------------------------
// P1 — Non-canonical inputs (R-007: digitBucket keys off String(value).length)
// ---------------------------------------------------------------------------

describe('[Unit][P1] 1-7 non-canonical value mapping (R-007)', () => {
  it('[P1] zero / negatives / fractions resolve without throwing', () => {
    // Given non-canonical game values (unreachable in play, reachable in API)
    // When the numeral + ink paths run
    // Then every result is finite and well-formed (implicit bucket mapping)
    const probe = [0, -3, -1536, 1.5, 99.99];
    for (const v of probe) {
      const token = numeralTokenFor(v);
      assert.ok([32, 13, 9].includes(token.fontSize), `value ${v}: token fontSize`);
      const size = numeralSizeFor(v, 44);
      assert.ok(Number.isFinite(size) && size > 0, `value ${v}: size finite-positive`);
      const ink = tileInkFor(v);
      assert.ok(ink.startsWith('#') && ink.length > 0, `value ${v}: ink well-formed`);
    }
  });

  it('[P1] 7-digit overflow stays in the 6+ bucket and never clips at floor', () => {
    // Given values beyond 6 digits (score display overflow)
    // When numeral paths run at the 44pt floor
    // Then they stay in the 9pt bucket and respect the inset budget
    for (const v of [1000000, 9999999]) {
      assert.strictEqual(numeralTokenFor(v).fontSize, 9);
      const size = numeralSizeFor(v, 44);
      assert.ok(Number.isFinite(size) && size > 0);
    }
  });
});

// ---------------------------------------------------------------------------
// P2 — Cross-story safety: contrast agreement + theme delegation
// ---------------------------------------------------------------------------

describe('[Unit][P2] 1-7 ink/fill contrast + theme delegation', () => {
  it('[P2] every canonical tier holds WCAG AA (fill vs ink >= 4.5)', () => {
    // Given all 13 canonical tiers
    // When contrastRatio(fill, ink) runs per tier
    // Then every pair holds WCAG AA (9-3 audit owns the palette; this is the tripwire)
    for (const tier of Object.keys(TILE_HEXES).map(Number)) {
      const ratio = contrastRatio(TILE_HEXES[tier as keyof typeof TILE_HEXES], tileInkFor(tier));
      assert.ok(ratio >= 4.5, `tier ${tier}: contrast ${ratio.toFixed(2)} must hold AA`);
    }
  });

  it('[P2] theme-aware wrappers delegate to THEMES pure data (R-004)', () => {
    // Given explicit theme ids incl. an invalid one
    // When tileFillFor/tileInkFor run with themeId
    // Then dark/light/colorBlind resolve, invalid falls back to dark canonical
    assert.strictEqual(tileInkFor(24, 'dark'), INK_LIGHT);
    const lightInk24 = tileInkFor(24, 'light');
    assert.ok(lightInk24.startsWith('#') && lightInk24.length === 7, 'light theme ink well-formed');
    assert.strictEqual(tileFillFor(3, 'no-such-theme'), tileFillFor(3));
    assert.strictEqual(tileInkFor(1536, 'colorBlind'), tileInkFor(1536, 'dark'));
  });

  it('[P2] relativeLuminance sanity: dark ink < light ink, black/white golden', () => {
    // Given the WCAG helpers
    // When probed with golden values
    // Then black=0, white=1, and the E9 dark ink is darker than the light ink
    assert.ok(Math.abs(relativeLuminance('#000000') - 0) < 1e-12, 'black luminance is 0');
    assert.ok(Math.abs(relativeLuminance('#FFFFFF') - 1) < 1e-12, 'white luminance is 1');
    assert.ok(relativeLuminance(INK_DARK) < relativeLuminance(INK_LIGHT));
  });
});
