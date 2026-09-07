import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// ATDD RED PHASE SCAFFOLD — Story 1-5 Layout portrait e landscape
// Generated: 2026-09-07 | TEA (Murat) | working tree at HEAD 0125b87
// (story 1-5 landed; code diff since baseline_revision is empty — these are
// regression guards pinning the working-tree contracts, not pre-implementation
// scaffolds for missing modules).
// All tests are `test.skip()` — they assert EXPECTED behavior from the spec
// and stay CI-green until a developer activates them for a layout task.
// Activation: remove `test.skip` for the current task, run the triade suite,
// confirm RED (contract broken) then GREEN (contract holds).
//
// Working-tree delta covered (story 1-5 as landed, incl. later hardening):
// - triade/src/ui/layout.ts: SAFE_MARGIN=16, PORTRAIT_BAND_HEIGHT=96,
//   LANDSCAPE_BAND_HEIGHT=48, layoutFor maximize + NaN/Infinity guard,
//   getBandTop helper, BOARD_SIZE_FLOOR linkage to MIN_TILE_WIDTH
// - triade/src/ui/orientation.ts: isLandscape(w,h) = w > h
// - triade/src/ui/useSyncedLayout.ts: useWindowDimensions + useSafeAreaInsets
//   coalesced through layoutFor/getBandTop (rotation-race hardening)
// - triade/src/ui/Hud.tsx: portrait band (34pt score, spacer-first pauseSlot
//   so PauseButton sits top-right) + landscape thin band (22/11pt left,
//   preview+pause right), getBandTop heights, pointerEvents-none decor
// - triade/src/ui/PauseButton.tsx: HIT_TARGET=48, width/height HIT_TARGET
// - triade/App.tsx: SafeAreaProvider root, Hud wired with bandHeight,
//   content paddingTop=bandTop, paddingBottom includes insets.bottom
// - triade/app.json: expo.orientation "default" (landscape unlocked)
//
// Host-only: node:test, no RN/native, no browser harness. Native rotation,
// notch/home-indicator rendering, and simulator visuals stay MANUAL (T5.1).

const LAYOUT = fileURLToPath(new URL('../../../triade/src/ui/layout.ts', import.meta.url));
const ORIENTATION = fileURLToPath(new URL('../../../triade/src/ui/orientation.ts', import.meta.url));
const SYNCED = fileURLToPath(new URL('../../../triade/src/ui/useSyncedLayout.ts', import.meta.url));
const HUD = fileURLToPath(new URL('../../../triade/src/ui/Hud.tsx', import.meta.url));
const PAUSE = fileURLToPath(new URL('../../../triade/src/ui/PauseButton.tsx', import.meta.url));
const APP = fileURLToPath(new URL('../../../triade/App.tsx', import.meta.url));
const APP_JSON = fileURLToPath(new URL('../../../triade/app.json', import.meta.url));

// NOTE: .ts sources are loaded via dynamic import() INSIDE the (skipped)
// test bodies — never at top level — so this scaffold loads cleanly without
// a TS loader resolving value imports at require time (repo convention).
const loadLayout = () => import('../../../triade/src/ui/layout.ts');
const loadOrientation = () => import('../../../triade/src/ui/orientation.ts');
const loadNumerals = () => import('../../../triade/src/ui/tileNumerals.ts');

type Insets = { top: number; bottom: number; left: number; right: number };
const ZERO: Insets = { top: 0, bottom: 0, left: 0, right: 0 };
const PORTRAIT_NOTCH: Insets = { top: 47, bottom: 34, left: 0, right: 0 };
const LANDSCAPE_NOTCH: Insets = { top: 0, bottom: 0, left: 47, right: 21 };

// ── P0: portrait maximizes width-bounded (AC-1/4/5) ──────────────────────

test.skip('[P0] U1 portrait 390x844 notch: not landscape, band 96, board 358 width-bounded', async () => {
  // Given iPhone portrait with notch + home indicator
  // When layoutFor runs
  // Then board = 390-0-0-32 = 358 (width bound wins over 844-47-34-32-96 = 635)
  const { layoutFor } = await loadLayout();
  const r = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
  assert.equal(r.isLandscape, false);
  assert.equal(r.bandHeight, 96);
  assert.equal(r.boardSize, 358);
  // Expected failure: any SAFE_MARGIN/band drift or height-bound regression changes 358
});

// ── P0: landscape dominates below thin band (AC-2/6) ─────────────────────

test.skip('[P0] U2 landscape 844x390: landscape, band 48, board 310 height-bounded', async () => {
  // Given landscape with left/right sensor insets
  // When layoutFor runs
  // Then board = min(844-47-21-32=744, 390-0-0-32-48=310) = 310, board dominates band
  const { layoutFor } = await loadLayout();
  const r = layoutFor({ width: 844, height: 390, insets: LANDSCAPE_NOTCH });
  assert.equal(r.isLandscape, true);
  assert.equal(r.bandHeight, 48);
  assert.equal(r.boardSize, 310);
  assert.ok(r.boardSize > r.bandHeight, 'board must dominate the thin band');
  // Expected failure: band-height drift (44 vs 48) or bound swap changes 310
});

// ── P0: band collapse ordering (AC-6/D-006) ──────────────────────────────

test.skip('[P0] U3 landscape band strictly thinner than portrait, both positive', async () => {
  // Given both orientation constants
  // When compared
  // Then 0 < 48 < 96 (D-006 thin top edge band)
  const { PORTRAIT_BAND_HEIGHT, LANDSCAPE_BAND_HEIGHT } = await loadLayout();
  assert.equal(PORTRAIT_BAND_HEIGHT, 96);
  assert.equal(LANDSCAPE_BAND_HEIGHT, 48);
  assert.ok(LANDSCAPE_BAND_HEIGHT < PORTRAIT_BAND_HEIGHT);
  assert.ok(LANDSCAPE_BAND_HEIGHT > 0);
  // Expected failure: LANDSCAPE_BAND_HEIGHT 44 (pre-review value) fails the 48 pin
});

// ── P0: safe margin + band-top identity (AC-4/UX-DR-4) ───────────────────

test.skip('[P0] U4 SAFE_MARGIN is 16 and getBandTop = top + 16 + bandHeight', async () => {
  // Given UX-DR-4 16pt safe margin
  // When getBandTop runs on the portrait notch
  // Then 47 + 16 + 96 = 159 (single Helper, no duplicated formula)
  const { getBandTop, SAFE_MARGIN, PORTRAIT_BAND_HEIGHT, LANDSCAPE_BAND_HEIGHT } = await loadLayout();
  assert.equal(SAFE_MARGIN, 16);
  assert.equal(getBandTop(PORTRAIT_NOTCH, PORTRAIT_BAND_HEIGHT), 159);
  assert.equal(getBandTop(ZERO, LANDSCAPE_BAND_HEIGHT), 64);
  // Expected failure: margin drift or re-inlined band math breaks 159/64
});

// ── P0: maximize identity sweep (AC-5/UX-DR-20) ──────────────────────────

test.skip('[P0] U5 boardSize = max(0, min(availW, availH)) across sweep incl. extremes', async () => {
  // Given board maximizes in the space left (never hand-set)
  // When swept over portrait/landscape/square/small/extreme sizes
  // Then board equals the bounded minimum and stays finite and non-negative
  const { layoutFor, SAFE_MARGIN, PORTRAIT_BAND_HEIGHT, LANDSCAPE_BAND_HEIGHT } = await loadLayout();
  const cases: Array<{ w: number; h: number; insets: Insets }> = [
    { w: 390, h: 844, insets: PORTRAIT_NOTCH },
    { w: 844, h: 390, insets: LANDSCAPE_NOTCH },
    { w: 500, h: 500, insets: ZERO },
    { w: 320, h: 480, insets: ZERO },
    { w: 2000, h: 200, insets: ZERO },
    { w: 200, h: 2000, insets: ZERO },
    { w: 500, h: 580, insets: PORTRAIT_NOTCH },
  ];
  for (const c of cases) {
    const r = layoutFor({ width: c.w, height: c.h, insets: c.insets });
    const band = r.isLandscape ? LANDSCAPE_BAND_HEIGHT : PORTRAIT_BAND_HEIGHT;
    const availW = c.w - c.insets.left - c.insets.right - 2 * SAFE_MARGIN;
    const availH = c.h - c.insets.top - c.insets.bottom - 2 * SAFE_MARGIN - band;
    assert.equal(r.boardSize, Math.max(0, Math.min(availW, availH)), `maximize identity for ${c.w}x${c.h}`);
    assert.ok(Number.isFinite(r.boardSize));
    assert.ok(r.boardSize >= 0);
  }
  // Expected failure: fixed-constant board or dropped margin/inset term breaks identity
});

// ── P0: tile size derives from container (AC-5) ──────────────────────────

test.skip('[P0] U6 two container widths yield different boards — never a constant', async () => {
  // Given tile size derives from the container
  // When width grows 390 -> 500 at fixed height/insets
  // Then board grows 358 -> 468 (proportional, not hand-set)
  const { layoutFor } = await loadLayout();
  const a = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
  const b = layoutFor({ width: 500, height: 844, insets: PORTRAIT_NOTCH });
  assert.equal(a.boardSize, 358);
  assert.equal(b.boardSize, 468);
  assert.ok(b.boardSize > a.boardSize);
  // Expected failure: hard-coded boardSize passes one fixture and fails the other
});

// ── P0: non-finite guard (DW-5) ──────────────────────────────────────────

test.skip('[P0] U7 NaN/Infinity on any of 6 fields degrades to finite {0, 96, false}', async () => {
  // Given degenerate runtime inputs
  // When layoutFor runs
  // Then it never throws, never returns NaN, falls back to portrait band
  const { layoutFor, PORTRAIT_BAND_HEIGHT } = await loadLayout();
  const variants: Array<{ width: number; height: number; insets: Insets }> = [
    { width: NaN, height: 844, insets: ZERO },
    { width: 390, height: Infinity, insets: ZERO },
    { width: 390, height: 844, insets: { top: NaN, bottom: 0, left: 0, right: 0 } },
    { width: 390, height: 844, insets: { top: 0, bottom: Infinity, left: 0, right: 0 } },
    { width: 390, height: 844, insets: { top: 0, bottom: 0, left: -Infinity, right: 0 } },
    { width: 390, height: 844, insets: { top: 0, bottom: 0, left: 0, right: NaN } },
  ];
  for (const v of variants) {
    let r: { boardSize: number; bandHeight: number; isLandscape: boolean } | undefined;
    assert.doesNotThrow(() => { r = layoutFor(v); });
    r = layoutFor(v);
    assert.equal(r.boardSize, 0);
    assert.equal(r.bandHeight, PORTRAIT_BAND_HEIGHT);
    assert.equal(r.isLandscape, false);
    assert.ok(Number.isFinite(r.boardSize) && Number.isFinite(r.bandHeight));
  }
  // Expected failure: pre-guard code propagates NaN into boardSize
});

// ── P1: orientation boundary + purity (T2.2) ─────────────────────────────

test.skip('[P1] U8 isLandscape boundary: > true, < false, equal false, 501/500 vs 499/500', async () => {
  // Given orientation is the single source of truth mirrored by the hook
  // When probed at and around the boundary
  // Then landscape = width > height exactly
  const { layoutFor } = await loadLayout();
  const { isLandscape } = await loadOrientation();
  assert.equal(isLandscape(844, 390), true);
  assert.equal(isLandscape(390, 844), false);
  assert.equal(isLandscape(500, 500), false);
  assert.equal(isLandscape(501, 500), true);
  assert.equal(isLandscape(499, 500), false);
  assert.equal(layoutFor({ width: 844, height: 390, insets: ZERO }).isLandscape, isLandscape(844, 390));
  assert.equal(layoutFor({ width: 390, height: 844, insets: ZERO }).isLandscape, isLandscape(390, 844));
  // Determinism: repeated calls agree
  assert.equal(isLandscape(844, 390), isLandscape(844, 390));
  // Expected failure: >= boundary (>= makes square landscape) breaks 500x500
});

// ── P1: floor linkage (UX-DR-18/AC-1) ────────────────────────────────────

test.skip('[P1] U9 BOARD_SIZE_FLOOR links to MIN_TILE_WIDTH (4x4 grid + padding + gaps)', async () => {
  // Given tile min ~44pt floor feeds the board floor
  // When derived
  // Then FLOOR = MIN_TILE_WIDTH*4 + 8*2 + 8*3 = 216, integer > 0
  const { BOARD_SIZE_FLOOR } = await loadLayout();
  const { MIN_TILE_WIDTH } = await loadNumerals();
  assert.equal(BOARD_SIZE_FLOOR, MIN_TILE_WIDTH * 4 + 8 * 2 + 8 * 3);
  assert.equal(BOARD_SIZE_FLOOR, 216);
  assert.ok(Number.isInteger(BOARD_SIZE_FLOOR) && BOARD_SIZE_FLOOR > 0);
  // Expected failure: hand-set floor constant decoupled from tileNumerals drifts
});

// ── P1: insets monotonicity (AC-4) ───────────────────────────────────────

test.skip('[P1] U10 adding insets never grows the board; asymmetric notch binds', async () => {
  // Given per-edge safe insets + 16pt margin
  // When insets grow
  // Then board shrinks or holds, never grows; notch fixtures bind the min term
  const { layoutFor } = await loadLayout();
  const base = layoutFor({ width: 390, height: 844, insets: ZERO });
  const notched = layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH });
  assert.ok(notched.boardSize <= base.boardSize);
  assert.equal(notched.boardSize, 358);
  const lBase = layoutFor({ width: 844, height: 390, insets: ZERO });
  const lNotched = layoutFor({ width: 844, height: 390, insets: LANDSCAPE_NOTCH });
  assert.ok(lNotched.boardSize <= lBase.boardSize);
  assert.equal(lNotched.boardSize, 310);
  // Expected failure: ignored vertical insets inflate the height-bounded board
});

// ── P0: orientation unlock (T1.1) ────────────────────────────────────────

test.skip('[P0] S1 app.json expo.orientation is "default" (landscape not hard-locked)', async () => {
  // Given the iOS orientation mask derives from app.json
  // When read
  // Then orientation unlocks all four (portrait hard-lock would make AC-2/6 unmountable)
  const raw = await readFile(APP_JSON, 'utf8');
  const cfg = JSON.parse(raw) as { expo?: { orientation?: string } };
  assert.equal(cfg.expo?.orientation, 'default');
  // Expected failure: "portrait" value re-locks iOS to portrait-only
});

// ── P0: safe-area + layout wiring (T1.3/T4.2) ────────────────────────────

test.skip('[P0] S2 SafeAreaProvider roots the app; useSyncedLayout coalesces dimensions+insets via layoutFor', async () => {
  // Given safe areas come from react-native-safe-area-context (UX-DR-4)
  // When sources are scanned
  // Then provider wraps the root with initialMetrics; the hook reads
  // useWindowDimensions + useSafeAreaInsets and derives via layoutFor/getBandTop;
  // App renders Hud with the derived bandHeight
  const app = await readFile(APP, 'utf8');
  const hook = await readFile(SYNCED, 'utf8');
  assert.match(app, /<SafeAreaProvider/, 'App root must render SafeAreaProvider');
  assert.match(app, /initialMetrics/, 'rotation race: initialMetrics required');
  assert.match(app, /<Hud/, 'App must render Hud in both orientations');
  assert.match(app, /bandHeight=\{bandHeight\}/, 'Hud must receive the derived bandHeight');
  assert.match(hook, /useWindowDimensions/, 'hook reads runtime dimensions');
  assert.match(hook, /useSafeAreaInsets/, 'hook reads native safe insets');
  assert.match(hook, /layoutFor\(/, 'hook derives board via layoutFor (no hand-set size)');
  assert.match(hook, /getBandTop\(/, 'hook derives bandTop via the single helper');
  // Expected failure: reverted App (hard-coded boardSize) or dropped provider breaks wiring
});

// ── P0: HUD composition pins (AC-1/2/3) ─────────────────────────────────

test.skip('[P0] S3 Hud pins portrait 34pt + landscape 22/11pt, pause top-right, preview slots, no-touch decor', async () => {
  // Given mockups key-game-portrait/landscape.html own the composition
  // When Hud source is scanned
  // Then portrait score 34 / landscape score 22 + best 11; pause is the LAST
  // child of both bands (top-right); preview sits bottom-corner portrait and
  // band-right landscape; decorative layers never intercept touches
  const src = await readFile(HUD, 'utf8');
  assert.match(src, /fontSize:\s*34/, 'portrait score display 34pt (UX-DR-7)');
  assert.match(src, /fontSize:\s*22/, 'landscape score 22pt (UX-DR-5)');
  assert.match(src, /fontSize:\s*11/, 'landscape best 11pt (UX-DR-5)');
  assert.match(src, /numberOfLines=\{2\}/, 'score Texts clamp lines at large Dynamic Type');
  assert.match(src, /allowFontScaling/, 'Dynamic Type honored (UX-DR-24, never disabled)');
  const portraitBand = /portraitBand[\s\S]*?pauseSlot[\s\S]*?scoreWrap[\s\S]*?pauseSlot[\s\S]*?PauseButton/.exec(src);
  assert.ok(portraitBand, 'portrait: spacer slot, score center, PauseButton last (top-right)');
  const landscapeBand = /landscapeBand[\s\S]*?landscapeLeft[\s\S]*?landscapeRight[\s\S]*?PauseButton/.exec(src);
  assert.ok(landscapeBand, 'landscape: score+best left, preview+pause right, pause last (corner)');
  assert.match(src, /height:\s*getBandTop\(insets,\s*bandHeight\)/, 'both bands size via getBandTop (no duplicated formula)');
  assert.match(src, /pointerEvents="none"/, 'decorative preview layer must not absorb touches');
  assert.match(src, /pointerEvents="box-none"/, 'overlay passes touches except on controls');
  // Expected failure: pause-first ordering (top-left bug), fixed band heights, touch-eating decor
});

// ── P0: pause hit target (AC-3/UX-DR-6) ──────────────────────────────────

test.skip('[P0] S4 PauseButton HIT_TARGET is 48 (>=44) referenced directly, no arithmetic', async () => {
  // Given pause is top-right in both orientations, outside the swipe rect
  // When source is scanned
  // Then HIT_TARGET exports 48 and styles reference it verbatim (token, not value)
  const src = await readFile(PAUSE, 'utf8');
  const m = /export\s+const\s+HIT_TARGET\s*=\s*(\d+)/.exec(src);
  assert.ok(m, 'PauseButton must export HIT_TARGET');
  assert.equal(Number(m[1]), 48);
  assert.ok(Number(m[1]) >= 44, 'hit target >= 44x44 (UX-DR-6)');
  assert.match(src, /width:\s*HIT_TARGET,/, 'width references HIT_TARGET with no arithmetic');
  assert.match(src, /height:\s*HIT_TARGET,/, 'height references HIT_TARGET with no arithmetic');
  // Expected failure: width: HIT_TARGET - 10 (38pt) or literal 40 breaks the floor
});

// ── P1: thin-view boundary (ADR-01/05) ───────────────────────────────────

test.skip('[P1] S5 thin view: Hud imports only SAFE_MARGIN/getBandTop/type from ./layout; pure modules import no RN', async () => {
  // Given layout math is pure TS (host-testable) and views stay thin
  // When imports are scanned
  // Then Hud never pulls layoutFor/isLandscape/band constants (rule duplication
  // would slip past a same-dir allowlist); layout.ts imports only
  // orientation.ts + tileNumerals.ts; orientation.ts imports nothing
  const hud = await readFile(HUD, 'utf8');
  const hudLayoutImport = /from\s+['"]\.\/layout['"]/.exec(hud);
  assert.ok(hudLayoutImport, 'Hud imports from ./layout');
  const named = /import\s*\{([^}]*)\}\s*from\s*['"]\.\/layout['"]/.exec(hud);
  assert.ok(named, 'named import from ./layout must exist');
  const names = named[1].split(',').map((s) => s.trim());
  for (const banned of ['layoutFor', 'isLandscape', 'PORTRAIT_BAND_HEIGHT', 'LANDSCAPE_BAND_HEIGHT', 'BOARD_SIZE_FLOOR']) {
    assert.ok(!names.includes(banned), `Hud must not import ${banned} from ./layout`);
  }
  const layoutSrc = await readFile(LAYOUT, 'utf8');
  // Word-boundary patterns: bare substring 'expo' would false-positive on
  // every `export` keyword; match module references instead.
  const bannedPatterns = [
    /from\s+['"]react-native['"]/,
    /from\s+['"]react['"]/,
    /\bexpo-[a-z-]+\b/,
    /\b@shopify\/react-native-skia\b/,
    /\bexpo\b(?!\s*[:.])/,
  ];
  for (const re of bannedPatterns) {
    assert.ok(!re.test(layoutSrc), `layout.ts must not match ${re}`);
  }
  const orientSrc = await readFile(ORIENTATION, 'utf8');
  assert.ok(!/^\s*import\s/m.test(orientSrc), 'orientation.ts must have zero imports');
  // Expected failure: Hud calling layoutFor directly re-duplicates the band formula in the view
});

// ── P1: safe-margin padding, no double-apply (AC-4) ──────────────────────

test.skip('[P1] S6 content paddingTop uses bandTop; paddingBottom includes insets.bottom', async () => {
  // Given the board sits below the HUD band inside safe margins
  // When App content style is scanned
  // Then top offset is the single bandTop value (no second manual inset add);
  // bottom padding carries insets.bottom (home-indicator overlap at scroll end)
  const src = await readFile(APP, 'utf8');
  assert.match(src, /paddingTop:\s*bandTop/, 'content top offset is the derived bandTop');
  assert.match(src, /paddingBottom:\s*24\s*\+\s*insets\.bottom/, 'bottom padding respects home indicator');
  // Expected failure: hard-coded paddingTop or dropped insets.bottom reintroduces overlap
});
