import { test } from 'node:test';
import assert from 'node:assert';

// Story 1.5 red-phase ATDD contract (T2.1, UX-DR-4/20, D-006/D-007):
// layout.ts is pure TS (ADR-01 spirit) — it must export SAFE_MARGIN and a
// single layoutFor({ width, height, insets }) -> { boardSize, bandHeight,
// isLandscape }. Board side length = maximized square inside the safe margins
// + the 16pt safe margin on every edge (bounded by available space); band
// height per orientation; landscape band is the thin top edge band and the
// board dominates below it. Variable-specifier dynamic imports keep
// `tsc --noEmit` green until the developer activates these scaffolds.

interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface LayoutResult {
  boardSize: number;
  bandHeight: number;
  isLandscape: boolean;
}

const LAYOUT_SPEC = '../../src/ui/layout.ts';
const ORIENTATION_SPEC = '../../src/ui/orientation.ts';

const ZERO_INSETS: Insets = { top: 0, bottom: 0, left: 0, right: 0 };
const PORTRAIT_NOTCH: Insets = { top: 47, bottom: 34, left: 0, right: 0 };
const LANDSCAPE_NOTCH: Insets = { top: 0, bottom: 0, left: 47, right: 21 };

function availWidth(width: number, insets: Insets, safeMargin: number): number {
  return width - insets.left - insets.right - 2 * safeMargin;
}

function availHeight(height: number, insets: Insets, safeMargin: number): number {
  return height - insets.top - insets.bottom - 2 * safeMargin;
}

test('[P0] layoutFor on a portrait phone (390x844, notch top 47 + home bottom 34) reports isLandscape=false and a width-bounded maximized board (AC-1, AC-4, AC-5)', async () => {
  const { layoutFor, SAFE_MARGIN } = (await import(LAYOUT_SPEC)) as {
    layoutFor: (input: { width: number; height: number; insets: Insets }) => LayoutResult;
    SAFE_MARGIN: number;
  };
  const layout = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
  assert.strictEqual(layout.isLandscape, false, 'portrait must report isLandscape=false');
  const horizontal = availWidth(390, PORTRAIT_NOTCH, SAFE_MARGIN);
  const vertical = availHeight(844, PORTRAIT_NOTCH, SAFE_MARGIN) - layout.bandHeight;
  assert.strictEqual(
    layout.boardSize,
    Math.min(horizontal, vertical),
    'boardSize must be the maximized square inside safe margins + 16pt margin'
  );
  assert.strictEqual(layout.boardSize, horizontal, 'portrait board is width-bounded on a 390-wide screen');
});

test('[P0] layoutFor on a landscape phone (844x390, left notch 47 + right home 21) reports isLandscape=true and a height-bounded board below the band (AC-2, AC-6)', async () => {
  const { layoutFor, SAFE_MARGIN } = (await import(LAYOUT_SPEC)) as {
    layoutFor: (input: { width: number; height: number; insets: Insets }) => LayoutResult;
    SAFE_MARGIN: number;
  };
  const layout = layoutFor({ width: 844, height: 390, insets: LANDSCAPE_NOTCH });
  assert.strictEqual(layout.isLandscape, true, 'landscape must report isLandscape=true');
  const horizontal = availWidth(844, LANDSCAPE_NOTCH, SAFE_MARGIN);
  const vertical = availHeight(390, LANDSCAPE_NOTCH, SAFE_MARGIN) - layout.bandHeight;
  assert.strictEqual(
    layout.boardSize,
    Math.min(horizontal, vertical),
    'boardSize must be the maximized square inside safe margins + 16pt margin'
  );
  assert.strictEqual(layout.boardSize, vertical, 'landscape board is height-bounded below the thin band');
  assert.ok(layout.boardSize > layout.bandHeight, 'board dominates the thin top edge band (D-006)');
});

test('[P0] the landscape HUD collapses: bandHeight(landscape) is strictly smaller than bandHeight(portrait) (D-006 thin top edge band)', async () => {
  const { layoutFor } = (await import(LAYOUT_SPEC)) as {
    layoutFor: (input: { width: number; height: number; insets: Insets }) => LayoutResult;
  };
  const portrait = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
  const landscape = layoutFor({ width: 844, height: 390, insets: LANDSCAPE_NOTCH });
  assert.ok(portrait.bandHeight > 0, 'portrait band must be non-empty');
  assert.ok(landscape.bandHeight > 0, 'landscape band must be non-empty');
  assert.ok(
    landscape.bandHeight < portrait.bandHeight,
    'landscape band must collapse to a thin top edge band (D-006)'
  );
});

test('[P0] boardSize is the maximized square for a sweep of containers (AC-5, UX-DR-20)', async () => {
  const { layoutFor, SAFE_MARGIN } = (await import(LAYOUT_SPEC)) as {
    layoutFor: (input: { width: number; height: number; insets: Insets }) => LayoutResult;
    SAFE_MARGIN: number;
  };
  const sizes = [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 414, height: 896 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 }
  ];
  for (const { width, height } of sizes) {
    const layout = layoutFor({ width, height, insets: ZERO_INSETS });
    const horizontal = availWidth(width, ZERO_INSETS, SAFE_MARGIN);
    const vertical = availHeight(height, ZERO_INSETS, SAFE_MARGIN) - layout.bandHeight;
    assert.strictEqual(
      layout.boardSize,
      Math.min(horizontal, vertical),
      `width=${width} height=${height}: boardSize must equal the maximized square`
    );
  }
});

test('[P0] golden anchors: 414x896 portrait and 1024x768 landscape boards equal the maximized square exactly (regression anchors, UX-DR-20)', async () => {
  const { layoutFor } = (await import(LAYOUT_SPEC)) as {
    layoutFor: (input: { width: number; height: number; insets: Insets }) => LayoutResult;
  };
  const portrait = layoutFor({ width: 414, height: 896, insets: ZERO_INSETS });
  assert.strictEqual(portrait.isLandscape, false, '414x896 is portrait');
  assert.strictEqual(portrait.boardSize, 382, '414x896 portrait board = width-bounded maximized square (414 - 2*16)');
  const landscape = layoutFor({ width: 1024, height: 768, insets: ZERO_INSETS });
  assert.strictEqual(landscape.isLandscape, true, '1024x768 is landscape');
  assert.strictEqual(landscape.boardSize, 688, '1024x768 landscape board = height-bounded maximized square (768 - 2*16 - 48)');
});

test('[P0] band heights are pinned exactly: portrait 96 and landscape 48 (D-006 thin band, fits the 48pt hit target)', async () => {
  const { layoutFor, PORTRAIT_BAND_HEIGHT, LANDSCAPE_BAND_HEIGHT } = (await import(LAYOUT_SPEC)) as {
    layoutFor: (input: { width: number; height: number; insets: Insets }) => LayoutResult;
    PORTRAIT_BAND_HEIGHT: number;
    LANDSCAPE_BAND_HEIGHT: number;
  };
  assert.strictEqual(PORTRAIT_BAND_HEIGHT, 96, 'portrait band height must be 96pt');
  assert.strictEqual(LANDSCAPE_BAND_HEIGHT, 48, 'landscape band height must be 48pt (fits the >=44pt pause hit target)');
  const portrait = layoutFor({ width: 390, height: 844, insets: ZERO_INSETS });
  const landscape = layoutFor({ width: 844, height: 390, insets: ZERO_INSETS });
  assert.strictEqual(portrait.bandHeight, PORTRAIT_BAND_HEIGHT, 'portrait layout must report the portrait band');
  assert.strictEqual(landscape.bandHeight, LANDSCAPE_BAND_HEIGHT, 'landscape layout must report the landscape band');
});

test('[P0] golden anchor: 500x580 portrait is height-bounded and pins PORTRAIT_BAND_HEIGHT=96 independently (452 = 580 - 2*16 - 96)', async () => {
  const { layoutFor } = (await import(LAYOUT_SPEC)) as {
    layoutFor: (input: { width: number; height: number; insets: Insets }) => LayoutResult;
  };
  const layout = layoutFor({ width: 500, height: 580, insets: ZERO_INSETS });
  assert.strictEqual(layout.isLandscape, false, '500x580 is portrait');
  assert.strictEqual(layout.boardSize, 452, '500x580 portrait board = height-bounded maximized square (580 - 2*16 - 96)');
});

test('[P0] tile size derives from the container: two container widths give different board sizes, never a fixed constant (UX-DR-20)', async () => {
  const { layoutFor } = (await import(LAYOUT_SPEC)) as {
    layoutFor: (input: { width: number; height: number; insets: Insets }) => LayoutResult;
  };
  const small = layoutFor({ width: 320, height: 568, insets: ZERO_INSETS });
  const large = layoutFor({ width: 390, height: 844, insets: ZERO_INSETS });
  assert.ok(small.boardSize > 0, 'small container must yield a positive board');
  assert.ok(large.boardSize > small.boardSize, 'larger container must yield a larger board');
});

test('[P0] boardSize never exceeds the safe-margin-bounded available width or height (insets respected, AC-4)', async () => {
  const { layoutFor, SAFE_MARGIN } = (await import(LAYOUT_SPEC)) as {
    layoutFor: (input: { width: number; height: number; insets: Insets }) => LayoutResult;
    SAFE_MARGIN: number;
  };
  const cases = [
    { width: 390, height: 844, insets: PORTRAIT_NOTCH },
    { width: 844, height: 390, insets: LANDSCAPE_NOTCH },
    { width: 320, height: 480, insets: { top: 47, bottom: 34, left: 0, right: 0 } },
    { width: 1024, height: 768, insets: { top: 0, bottom: 0, left: 0, right: 0 } }
  ];
  for (const { width, height, insets } of cases) {
    const layout = layoutFor({ width, height, insets });
    assert.ok(
      layout.boardSize <= availWidth(width, insets, SAFE_MARGIN),
      `width=${width}: boardSize must fit inside the horizontal safe-margin bounds`
    );
    assert.ok(
      layout.boardSize <= availHeight(height, insets, SAFE_MARGIN) - layout.bandHeight,
      `height=${height}: boardSize must fit below the band inside the vertical safe-margin bounds`
    );
  }
});

test('[P0] SAFE_MARGIN is exactly 16pt and applied on every edge on top of per-edge insets (UX-DR-4, UX-DR-20)', async () => {
  const { SAFE_MARGIN } = (await import(LAYOUT_SPEC)) as { SAFE_MARGIN: number };
  assert.strictEqual(SAFE_MARGIN, 16, 'safe margin must be 16pt on every edge');
});

test('[P0] small screen (320x480) yields a positive board that never overlaps the HUD band (testing standard edge case)', async () => {
  const { layoutFor, SAFE_MARGIN } = (await import(LAYOUT_SPEC)) as {
    layoutFor: (input: { width: number; height: number; insets: Insets }) => LayoutResult;
    SAFE_MARGIN: number;
  };
  const layout = layoutFor({ width: 320, height: 480, insets: ZERO_INSETS });
  assert.ok(layout.boardSize > 0, 'small screen must still yield a positive board');
  assert.ok(layout.bandHeight > 0, 'small screen must still yield a non-empty band');
  assert.ok(
    layout.boardSize + layout.bandHeight <= availHeight(480, ZERO_INSETS, SAFE_MARGIN),
    'board and band must not overlap'
  );
});

test('[P0] extreme landscape aspect (2000x200) yields a positive board with a thin band that the board dominates', async () => {
  const { layoutFor } = (await import(LAYOUT_SPEC)) as {
    layoutFor: (input: { width: number; height: number; insets: Insets }) => LayoutResult;
  };
  const layout = layoutFor({ width: 2000, height: 200, insets: ZERO_INSETS });
  assert.strictEqual(layout.isLandscape, true, 'extreme wide container is landscape');
  assert.ok(layout.boardSize > 0, 'extreme landscape must yield a positive board');
  assert.ok(layout.boardSize > layout.bandHeight, 'board dominates the band even at extreme aspect');
});

test('[P0] all layoutFor outputs are finite and the board is never negative across a sweep of sizes', async () => {
  const { layoutFor } = (await import(LAYOUT_SPEC)) as {
    layoutFor: (input: { width: number; height: number; insets: Insets }) => LayoutResult;
  };
  const sizes = [
    { width: 320, height: 480 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 2000, height: 200 },
    { width: 200, height: 2000 }
  ];
  for (const { width, height } of sizes) {
    const layout = layoutFor({ width, height, insets: ZERO_INSETS });
    assert.ok(Number.isFinite(layout.boardSize), `width=${width}: boardSize must be finite`);
    assert.ok(Number.isFinite(layout.bandHeight), `width=${width}: bandHeight must be finite`);
    assert.ok(layout.boardSize >= 0, `width=${width}: boardSize must never be negative`);
    assert.ok(layout.bandHeight > 0, `width=${width}: bandHeight must be positive`);
  }
});

test('[P0] degenerate insets that exceed the container clamp the board to 0 and never go negative (defensive clamp path)', async () => {
  const { layoutFor } = (await import(LAYOUT_SPEC)) as {
    layoutFor: (input: { width: number; height: number; insets: Insets }) => LayoutResult;
  };
  const layout = layoutFor({
    width: 320,
    height: 480,
    insets: { top: 2000, bottom: 0, left: 0, right: 0 }
  });
  assert.ok(layout.boardSize >= 0, 'boardSize must never be negative');
  assert.strictEqual(layout.boardSize, 0, 'insets exceeding the container must clamp the board to 0');
  assert.ok(layout.bandHeight > 0, 'the band must still render when the board clamps');
});

test('[P1] layoutFor.isLandscape agrees with isLandscape(width, height) — single source of truth (T2.2)', async () => {
  const { layoutFor } = (await import(LAYOUT_SPEC)) as {
    layoutFor: (input: { width: number; height: number; insets: Insets }) => LayoutResult;
  };
  const { isLandscape } = (await import(ORIENTATION_SPEC)) as { isLandscape: (w: number, h: number) => boolean };
  const cases = [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 },
    { width: 2000, height: 200 }
  ];
  for (const { width, height } of cases) {
    const layout = layoutFor({ width, height, insets: ZERO_INSETS });
    assert.strictEqual(
      layout.isLandscape,
      isLandscape(width, height),
      `width=${width} height=${height}: layoutFor and isLandscape must agree`
    );
  }
});

test('[P1] per-edge insets bind asymmetrically: vertical insets shrink a height-bounded board, horizontal insets shrink a width-bounded board (AC-4)', async () => {
  const { layoutFor, SAFE_MARGIN } = (await import(LAYOUT_SPEC)) as {
    layoutFor: (input: { width: number; height: number; insets: Insets }) => LayoutResult;
    SAFE_MARGIN: number;
  };
  const horizontal = { top: 0, bottom: 0, left: 10, right: 10 } as Insets;
  const widthBounded = layoutFor({ width: 390, height: 844, insets: ZERO_INSETS });
  const withSideInsets = layoutFor({ width: 390, height: 844, insets: horizontal });
  assert.strictEqual(widthBounded.boardSize, 358, '390x844 portrait is width-bounded (390 - 2*16)');
  assert.strictEqual(withSideInsets.boardSize, 338, 'horizontal insets must shrink the width-bounded board (390 - 20 - 2*16)');
  assert.ok(
    widthBounded.boardSize > withSideInsets.boardSize,
    'horizontal insets must shrink a width-bounded board'
  );
  const heightBounded = layoutFor({ width: 500, height: 580, insets: ZERO_INSETS });
  const withNotch = layoutFor({ width: 500, height: 580, insets: PORTRAIT_NOTCH });
  const vertical = availHeight(580, PORTRAIT_NOTCH, SAFE_MARGIN) - withNotch.bandHeight;
  assert.strictEqual(heightBounded.boardSize, 452, '500x580 portrait is height-bounded (580 - 2*16 - 96)');
  assert.strictEqual(
    withNotch.boardSize,
    Math.min(availWidth(500, PORTRAIT_NOTCH, SAFE_MARGIN), vertical),
    'vertical insets must bind a height-bounded board'
  );
  assert.ok(
    heightBounded.boardSize > withNotch.boardSize,
    'vertical insets must shrink a height-bounded board'
  );
});