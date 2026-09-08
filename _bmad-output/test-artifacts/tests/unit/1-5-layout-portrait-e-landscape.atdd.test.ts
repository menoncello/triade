/**
 * TEA Automate — Unit expansion for 1-5-layout-portrait-e-landscape
 * Location: _bmad-output/test-artifacts/tests/unit/1-5-layout-portrait-e-landscape.atdd.test.ts
 * Runner: node:test + tsx (host-only, pure TS seam — no Playwright/Cypress).
 * TEA mapping: "Unit" = pure layoutFor/orientation/getBandTop math. Expands BEYOND
 * the ATDD red scaffolds (atdd-tests/1-5-layout-portrait-e-landscape.red.spec.ts,
 * 16 skipped) and the committed triade suites (layout 18 + orientation 5 +
 * purity 1 + thinview 2): no duplicate coverage — this file pins golden anchors,
 * the non-tautological height-bounded asymmetric case, degenerate guards,
 * proportionality/monotonicity, and fixture self-validation.
 *
 * Execute (from repo root):
 *   NODE_PATH=triade/node_modules TSX_TSCONFIG_PATH=triade/tsconfig.test.json \
 *     triade/node_modules/.bin/tsx --test \
 *     _bmad-output/test-artifacts/tests/unit/1-5-layout-portrait-e-landscape.atdd.test.ts
 *
 * Shipped Story 1.5 contract (final_revision 0ffd59a). Working tree carries no
 * production diff — every test below is ACTIVE and must PASS against the
 * shipped state. A revert of layout.ts / orientation.ts turns them RED.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  layoutFor,
  getBandTop,
  SAFE_MARGIN,
  PORTRAIT_BAND_HEIGHT,
  LANDSCAPE_BAND_HEIGHT,
  BOARD_SIZE_FLOOR,
} from '../../../../triade/src/ui/layout.ts';
import { isLandscape } from '../../../../triade/src/ui/orientation.ts';
import { MIN_TILE_WIDTH } from '../../../../triade/src/ui/tileNumerals.ts';
import {
  SAFE_MARGIN_EXPECTED,
  PORTRAIT_BAND_HEIGHT_EXPECTED,
  LANDSCAPE_BAND_HEIGHT_EXPECTED,
  BOARD_SIZE_FLOOR_EXPECTED,
  MIN_TILE_WIDTH_EXPECTED,
  PORTRAIT_PHONE,
  LANDSCAPE_PHONE,
  HEIGHT_BOUNDED_PORTRAIT,
  CRAMPED_CONTAINER,
  EXTREME_FIXTURES,
  DEGENERATE_INPUTS,
  ZERO_INSETS,
  assertLayoutFixturesContract,
} from '../../fixtures/1-5-layout-portrait-e-landscape-fixtures.ts';

// ---------------------------------------------------------------------------
// P0 — Golden anchors + shipped-state pins (AC-4/5/6, UX-DR-4/20, D-006)
// ---------------------------------------------------------------------------

describe('[Unit][P0] 1-5 constants golden anchors', () => {
  it('[P0] SAFE_MARGIN is 16 (UX-DR-4/20 per-edge margin)', () => {
    // Given the 16pt safe-margin contract on top of per-edge insets
    // When the constant is read
    // Then it equals 16
    assert.strictEqual(SAFE_MARGIN, SAFE_MARGIN_EXPECTED);
  });

  it('[P0] PORTRAIT_BAND_HEIGHT is 96 (independent pin, non-tautological)', () => {
    // Given the review finding that no test pinned 96 independently
    // When the constant is read
    // Then it equals 96
    assert.strictEqual(PORTRAIT_BAND_HEIGHT, PORTRAIT_BAND_HEIGHT_EXPECTED);
  });

  it('[P0] LANDSCAPE_BAND_HEIGHT is 48 (fits HIT_TARGET 48, mockup min-height)', () => {
    // Given the 44->48 review fix (button overflow at 44)
    // When the constant is read
    // Then it equals 48
    assert.strictEqual(LANDSCAPE_BAND_HEIGHT, LANDSCAPE_BAND_HEIGHT_EXPECTED);
  });

  it('[P0] BOARD_SIZE_FLOOR derives from MIN_TILE_WIDTH (44*4+8*2+8*3=216)', () => {
    // Given the 1.7 tile floor contract consumed by layout
    // When the floor is derived
    // Then MIN_TILE_WIDTH=44 and BOARD_SIZE_FLOOR=216
    assert.strictEqual(MIN_TILE_WIDTH, MIN_TILE_WIDTH_EXPECTED);
    assert.strictEqual(BOARD_SIZE_FLOOR, BOARD_SIZE_FLOOR_EXPECTED);
    assert.strictEqual(BOARD_SIZE_FLOOR, MIN_TILE_WIDTH * 4 + 8 * 2 + 8 * 3);
  });

  it('[P0] portrait phone maximizes width-bounded (390x844 notch -> board 358)', () => {
    // Given the iPhone portrait fixture (availW=358, availH=635)
    // When layoutFor runs
    // Then the board is width-bounded at 358 with the portrait band
    const r = layoutFor(PORTRAIT_PHONE);
    assert.strictEqual(r.isLandscape, false);
    assert.strictEqual(r.bandHeight, 96);
    assert.strictEqual(r.boardSize, 358);
  });

  it('[P0] landscape phone dominates height-bounded below the thin band', () => {
    // Given the rotated fixture (availW=718, availH=269)
    // When layoutFor runs
    // Then the band collapses to 48 and the board is height-bounded at 269
    const r = layoutFor(LANDSCAPE_PHONE);
    assert.strictEqual(r.isLandscape, true);
    assert.strictEqual(r.bandHeight, 48);
    // availW=844-47-47-32=718; availH=390-0-21-32-48=289 -> board 289
    assert.strictEqual(r.boardSize, 289);
    assert.ok(r.boardSize < 358, 'landscape board fits the short edge below the band');
  });

  it('[P0] height-bounded portrait golden anchor (500x580 -> board 452)', () => {
    // Given the 500x580 fixture (availW=468, availH=452)
    // When layoutFor runs
    // Then the board is height-bounded at 452 (580-32-96)
    const r = layoutFor(HEIGHT_BOUNDED_PORTRAIT);
    assert.strictEqual(r.isLandscape, false);
    assert.strictEqual(r.bandHeight, 96);
    assert.strictEqual(r.boardSize, 452);
  });

  it('[P0] getBandTop stacks top inset + margin + band', () => {
    // Given notch insets and the portrait band
    // When getBandTop runs
    // Then bandTop = 47+16+96 = 159
    assert.strictEqual(getBandTop({ top: 47, bottom: 34, left: 0, right: 0 }, 96), 159);
    assert.strictEqual(getBandTop(ZERO_INSETS, 48), 64);
  });
});

// ---------------------------------------------------------------------------
// P1 — Boundaries, asymmetric binding, degenerate guards, proportionality
// ---------------------------------------------------------------------------

describe('[Unit][P1] 1-5 orientation boundary + asymmetric insets', () => {
  it('[P1] isLandscape is width > height with square defaulting to portrait', () => {
    // Given the single-source-of-truth boundary
    // When width/height straddle the diagonal
    // Then landscape is strictly width > height
    assert.strictEqual(isLandscape(844, 390), true);
    assert.strictEqual(isLandscape(390, 844), false);
    assert.strictEqual(isLandscape(400, 400), false);
    assert.strictEqual(isLandscape(401, 400), true);
    assert.strictEqual(isLandscape(400, 401), false);
  });

  it('[P1] asymmetric vertical insets bind on a height-bounded board (non-tautological)', () => {
    // Given the height-bounded portrait fixture with extra bottom inset
    // When a 34pt home-indicator inset is added
    // Then the board shrinks by exactly 34 (vertical insets bind)
    const base = layoutFor(HEIGHT_BOUNDED_PORTRAIT);
    const withHome = layoutFor({
      ...HEIGHT_BOUNDED_PORTRAIT,
      insets: { top: 0, bottom: 34, left: 0, right: 0 },
    });
    assert.strictEqual(base.boardSize, 452);
    assert.strictEqual(withHome.boardSize, 452 - 34);
  });

  it('[P1] degenerate inputs clamp to board 0, portrait band, not landscape', () => {
    // Given non-finite width/height/insets (rotation transient shape)
    // When layoutFor runs
    // Then it never throws, never NaN: board 0, band 96, portrait
    for (const d of DEGENERATE_INPUTS) {
      const r = layoutFor(d);
      assert.strictEqual(r.boardSize, 0, d.name);
      assert.strictEqual(r.bandHeight, 96, d.name);
      assert.strictEqual(r.isLandscape, false, d.name);
    }
  });

  it('[P1] extreme aspects and tiny windows never go negative or throw', () => {
    // Given ultra-tall/ultra-wide/tiny/square containers
    // When layoutFor runs
    // Then the board is finite and >= 0
    for (const f of EXTREME_FIXTURES) {
      const r = layoutFor(f);
      assert.ok(Number.isFinite(r.boardSize), `${f.name} finite`);
      assert.ok(r.boardSize >= 0, `${f.name} non-negative`);
    }
    const cramped = layoutFor(CRAMPED_CONTAINER);
    assert.ok(cramped.boardSize >= 0 && Number.isFinite(cramped.boardSize));
  });

  it('[P1] board derives from the container (proportional, never a fixed constant)', () => {
    // Given two portrait containers differing only in width
    // When layoutFor runs on both
    // Then the boards differ proportionally (container-driven per UX-DR-20)
    const a = layoutFor({ width: 390, height: 844, insets: ZERO_INSETS });
    const b = layoutFor({ width: 430, height: 844, insets: ZERO_INSETS });
    assert.ok(b.boardSize > a.boardSize, 'wider container yields larger board');
    assert.strictEqual(b.boardSize - a.boardSize, 40);
  });

  it('[P1] sub-floor container yields avail (scaling fallback), never the floor', () => {
    // Given a container whose available space is below BOARD_SIZE_FLOOR
    // When layoutFor runs
    // Then the board is the (smaller) available size — numeral scaling owns legibility
    const r = layoutFor(CRAMPED_CONTAINER);
    // availW=200-32=168; availH=200-32-96=72 -> board 72 (< 216)
    assert.strictEqual(r.boardSize, 72);
    assert.ok(r.boardSize < BOARD_SIZE_FLOOR);
  });
});

// ---------------------------------------------------------------------------
// P2 — Purity / determinism / monotonicity + fixture self-check
// ---------------------------------------------------------------------------

describe('[Unit][P2] 1-5 determinism + fixture contract', () => {
  it('[P2] layoutFor is pure: same inputs, same outputs, no input mutation', () => {
    // Given a frozen input object
    // When layoutFor runs twice
    // Then results agree and the input is untouched
    const input = { width: 390, height: 844, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
    const snapshot = JSON.parse(JSON.stringify(input));
    const r1 = layoutFor(input);
    const r2 = layoutFor(input);
    assert.deepStrictEqual(r1, r2);
    assert.deepStrictEqual(input, snapshot);
  });

  it('[P2] larger containers never yield smaller boards (monotone)', () => {
    // Given a growing sequence of widths at fixed height/insets
    // When layoutFor runs across the sequence
    // Then boardSize is non-decreasing
    let prev = -1;
    for (const w of [300, 350, 390, 430, 500]) {
      const r = layoutFor({ width: w, height: 900, insets: ZERO_INSETS });
      assert.ok(r.boardSize >= prev, `monotone at width ${w}`);
      prev = r.boardSize;
    }
  });

  it('[P2] fixture tables are self-consistent (golden math documented)', () => {
    // Given the deterministic fixture tables
    // When the self-validation runs
    // Then hand-derived golden math holds
    assertLayoutFixturesContract();
  });
});
