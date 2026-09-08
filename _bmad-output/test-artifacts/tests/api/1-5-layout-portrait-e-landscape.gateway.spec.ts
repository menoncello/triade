/**
 * TEA Automate — API gateway (contract) for 1-5-layout-portrait-e-landscape
 * Location: _bmad-output/test-artifacts/tests/api/1-5-layout-portrait-e-landscape.gateway.spec.ts
 * Runner: node:test + tsx (host-only). TEA mapping: "API" = module-surface +
 * wiring contracts via static source scans (no RN runtime per project rules —
 * native composition is manual simulator validation, R-001).
 *
 * Execute (from repo root):
 *   NODE_PATH=triade/node_modules TSX_TSCONFIG_PATH=triade/tsconfig.test.json \
 *     triade/node_modules/.bin/tsx --test \
 *     _bmad-output/test-artifacts/tests/api/1-5-layout-portrait-e-landscape.gateway.spec.ts
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
import {
  PORTRAIT_PHONE,
  LANDSCAPE_PHONE,
  ZERO_INSETS,
  readSource,
  stripCommentsAndStrings,
  assertContains,
  assertMatches,
  assertAppWiringContract,
} from '../../fixtures/1-5-layout-portrait-e-landscape-fixtures.ts';

const layoutSrc = readSource('triade/src/ui/layout.ts');
const orientationSrc = readSource('triade/src/ui/orientation.ts');
const hudSrc = readSource('triade/src/ui/Hud.tsx');
const pauseSrc = readSource('triade/src/ui/PauseButton.tsx');
const appSrc = readSource('triade/App.tsx');
const appJsonRaw = readSource('triade/app.json');
const syncedSrc = readSource('triade/src/ui/useSyncedLayout.ts');

describe('[API][P0] 1-5 module surface (provider endpoint contract)', () => {
  it('[P0] layout.ts exports the full layout seam', () => {
    // Given the pure layout module as the provider
    // When its surface is inspected
    // Then all seam symbols exist with the shipped values
    assert.strictEqual(typeof layoutFor, 'function');
    assert.strictEqual(typeof getBandTop, 'function');
    assert.strictEqual(SAFE_MARGIN, 16);
    assert.strictEqual(PORTRAIT_BAND_HEIGHT, 96);
    assert.strictEqual(LANDSCAPE_BAND_HEIGHT, 48);
    assert.strictEqual(BOARD_SIZE_FLOOR, 216);
  });

  it('[P0] orientation.ts exports the single source of truth', () => {
    // Given orientation as the single source of truth (T2.2)
    // When isLandscape is called at the boundary
    // Then width > height is landscape, square is portrait
    assert.strictEqual(typeof isLandscape, 'function');
    assert.strictEqual(isLandscape(844, 390), true);
    assert.strictEqual(isLandscape(390, 844), false);
    assert.strictEqual(isLandscape(400, 400), false);
  });

  it('[P0] gateway round-trip: layoutFor agrees with isLandscape on both orientations', () => {
    // Given the consumer path (layoutFor delegates to isLandscape)
    // When both fixtures run
    // Then band + flag agree per orientation
    const p = layoutFor(PORTRAIT_PHONE);
    const l = layoutFor(LANDSCAPE_PHONE);
    assert.strictEqual(p.isLandscape, isLandscape(PORTRAIT_PHONE.width, PORTRAIT_PHONE.height));
    assert.strictEqual(l.isLandscape, isLandscape(LANDSCAPE_PHONE.width, LANDSCAPE_PHONE.height));
    assert.strictEqual(p.bandHeight, PORTRAIT_BAND_HEIGHT);
    assert.strictEqual(l.bandHeight, LANDSCAPE_BAND_HEIGHT);
  });

  it('[P0] floor is single-sourced from tileNumerals (no local 44 duplicate)', () => {
    // Given R-003/R-004 single-source for the tile floor
    // When layout.ts is scanned
    // Then it imports MIN_TILE_WIDTH and never hardcodes a second 44 derivation
    assertContains(layoutSrc, "from './tileNumerals", 'layout/floor import');
    assertContains(layoutSrc, 'MIN_TILE_WIDTH', 'layout/floor symbol');
    const clean = stripCommentsAndStrings(layoutSrc);
    assert.ok(!/BOARD_SIZE_FLOOR\s*=\s*216/.test(clean), 'floor derives, not a literal 216');
  });

  it('[P0] app.json unlocks landscape (expo.orientation default)', () => {
    // Given T1.1 (portrait hard-lock kills every landscape AC)
    // When app.json is read
    // Then expo.orientation is "default"
    const parsed = JSON.parse(appJsonRaw) as { expo?: { orientation?: string } };
    assert.strictEqual(parsed.expo?.orientation, 'default');
  });
});

describe('[API][P1] 1-5 wiring contracts (App + HUD + tripwires)', () => {
  it('[P1] App wires SafeAreaProvider + synced layout + Hud + board', () => {
    // Given App.tsx as the composition root
    // When the wiring contract is asserted
    // Then provider, seam, bandTop offset, board width, and Hud render hold
    assertAppWiringContract(appSrc);
  });

  it('[P1] purity gateway: layout/orientation import nothing from RN/Expo', () => {
    // Given ADR-01/05 (pure math, host-testable)
    // When import statements are scanned
    // Then no react-native/expo/react imports exist
    for (const [label, src] of [['layout.ts', layoutSrc], ['orientation.ts', orientationSrc]] as const) {
      const imports = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
      for (const spec of imports) {
        assert.ok(
          !/^(react|react-native|expo)/.test(spec) && !spec.includes('react-native') && !spec.startsWith('expo'),
          `${label}: forbidden runtime import ${spec}`,
        );
      }
    }
  });

  it('[P1] HIT_TARGET is the literal 48 with no arithmetic (AC-3 tripwire)', () => {
    // Given the review fix (HIT_TARGET - 10 bypassed the token match)
    // When PauseButton styles are scanned comment-stripped
    // Then width/height use the bare HIT_TARGET literal
    const clean = stripCommentsAndStrings(pauseSrc);
    assertContains(pauseSrc, 'HIT_TARGET = 48', 'PauseButton/HIT_TARGET value');
    assertMatches(clean, /width:\s*HIT_TARGET\s*[,}]/, 'PauseButton/width literal');
    assertMatches(clean, /height:\s*HIT_TARGET\s*[,}]/, 'PauseButton/height literal');
  });

  it('[P1] Hud stays a thin view (imports only tokens from ./layout)', () => {
    // Given the thin-view rule (no layoutFor/isLandscape/band constants in Hud)
    // When Hud's ./layout import is inspected
    // Then only SAFE_MARGIN/getBandTop/EdgeInsets-type are imported
    const m = hudSrc.match(/import\s*\{([^}]*)\}\s*from\s*['"]\.\/layout['"]/);
    assert.ok(m, 'Hud imports from ./layout');
    const names = m![1].split(',').map((s) => s.trim()).filter(Boolean);
    for (const forbidden of ['layoutFor', 'isLandscape', 'PORTRAIT_BAND_HEIGHT', 'LANDSCAPE_BAND_HEIGHT', 'BOARD_SIZE_FLOOR']) {
      assert.ok(!names.some((n) => n.includes(forbidden)), `Hud must not import ${forbidden}`);
    }
    assert.ok(names.some((n) => n.includes('SAFE_MARGIN')), 'Hud may import SAFE_MARGIN');
  });

  it('[P1] Hud typography tokens: 34 portrait, 22/11 landscape (UX-DR-5/7)', () => {
    // Given the per-orientation type contracts
    // When Hud styles are scanned
    // Then fontSize 34 (portrait score), 22 + 11 (landscape score/best) exist
    assertMatches(hudSrc, /fontSize:\s*34/, 'Hud/portrait score 34pt');
    assertMatches(hudSrc, /fontSize:\s*22/, 'Hud/landscape score 22pt');
    assertMatches(hudSrc, /fontSize:\s*11/, 'Hud/landscape best 11pt');
  });
});

describe('[API][P2] 1-5 hardening monitors', () => {
  it('[P2] preview slots are touch-transparent + overlay wins hit-testing', () => {
    // Given the shipped pause-reachability fixes (zIndex + pointerEvents)
    // When Hud is scanned
    // Then overlay carries zIndex and preview slots are pointerEvents none/box-none
    assertMatches(hudSrc, /zIndex:\s*1/, 'Hud/overlay zIndex');
    assert.ok(hudSrc.includes('pointerEvents="none"'), 'Hud/preview pointerEvents none');
    assert.ok(hudSrc.includes('pointerEvents="box-none"'), 'Hud/overlay box-none');
  });

  it('[P2] rotation seam debounces + holds last-valid layout (DW-6 containment)', () => {
    // Given the rotation-race containment (insets lag dimensions one frame)
    // When useSyncedLayout is scanned
    // Then debounce + last-valid-board guard exist
    assertContains(syncedSrc, 'useWindowDimensions', 'synced/dimensions hook');
    assertContains(syncedSrc, 'useSafeAreaInsets', 'synced/insets hook');
    assertContains(syncedSrc, 'lastValidLayoutRef', 'synced/last-valid guard');
    assertContains(syncedSrc, 'setTimeout', 'synced/debounce');
  });

  it('[P2] zero-inset getBandTop anchor (bandTop = 16 + band)', () => {
    // Given devices with no notch (R-006 class)
    // When getBandTop runs with zero insets
    // Then bandTop is margin + band only
    assert.strictEqual(getBandTop(ZERO_INSETS, 96), 112);
    assert.strictEqual(getBandTop(ZERO_INSETS, 48), 64);
  });
});
