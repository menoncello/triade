/**
 * TEA Automate — E2E umbrella (composed journeys) for 1-5-layout-portrait-e-landscape
 * Location: _bmad-output/test-artifacts/tests/e2e/1-5-layout-portrait-e-landscape.umbrella.spec.ts
 * Runner: node:test + tsx (host-only analytic composition — no Playwright/Cypress).
 * TEA mapping: "E2E" = end-to-end journeys composed across layoutFor + orientation +
 * wiring scans. Pixel truth stays a MANUAL operator gate per project rules
 * (native rotation is a physical gesture; TCC blocks it unattended — R-001).
 *
 * Execute (from repo root):
 *   NODE_PATH=triade/node_modules TSX_TSCONFIG_PATH=triade/tsconfig.test.json \
 *     triade/node_modules/.bin/tsx --test \
 *     _bmad-output/test-artifacts/tests/e2e/1-5-layout-portrait-e-landscape.umbrella.spec.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { layoutFor, getBandTop } from '../../../../triade/src/ui/layout.ts';
import { isLandscape } from '../../../../triade/src/ui/orientation.ts';
import {
  PORTRAIT_PHONE,
  LANDSCAPE_PHONE,
  CRAMPED_CONTAINER,
  ZERO_INSETS,
  HIT_TARGET_EXPECTED,
  LANDSCAPE_BAND_HEIGHT_EXPECTED,
  readSource,
  assertContains,
} from '../../fixtures/1-5-layout-portrait-e-landscape-fixtures.ts';

describe('[E2E][P0] 1-5 portrait journey (AC-1/3/4/5)', () => {
  it('[P0] notch portrait: band 96, width-bounded board, tiles >= ~44pt', () => {
    // Given the app booted in portrait on a notch iPhone (390x844, top 47 / bottom 34)
    // When HUD + board compose (bandTop offset, container-derived board)
    // Then bandTop=159, board=358, tile=(358-16-24)/4~=79.5 (legible, 1.7 owns <44)
    const r = layoutFor(PORTRAIT_PHONE);
    assert.strictEqual(r.isLandscape, false);
    assert.strictEqual(r.bandHeight, 96);
    assert.strictEqual(r.boardSize, 358);
    const bandTop = getBandTop(PORTRAIT_PHONE.insets, r.bandHeight);
    assert.strictEqual(bandTop, 159);
    const tile = (r.boardSize - 16 - 24) / 4;
    assert.ok(tile >= 44, `portrait tile ${tile} >= 44pt floor`);
  });
});

describe('[E2E][P0] 1-5 landscape journey (AC-2/6)', () => {
  it('[P0] rotated phone: thin 48 band, board dominates below it, tiles scale', () => {
    // Given the same phone rotated (844x390, landscape insets)
    // When HUD collapses + board recomposes
    // Then band=48, board=289 height-bounded below the band, tiles scale down
    const before = layoutFor(PORTRAIT_PHONE);
    const after = layoutFor(LANDSCAPE_PHONE);
    assert.strictEqual(isLandscape(LANDSCAPE_PHONE.width, LANDSCAPE_PHONE.height), true);
    assert.strictEqual(after.bandHeight, 48);
    assert.strictEqual(after.boardSize, 289);
    assert.ok(after.boardSize > after.bandHeight * 2, 'board dominates below the thin band');
    const tileBefore = (before.boardSize - 16 - 24) / 4;
    const tileAfter = (after.boardSize - 16 - 24) / 4;
    assert.ok(tileAfter < tileBefore, 'tiles scale with the container (never hand-set)');
    assert.ok(tileAfter > 0 && Number.isFinite(tileAfter));
  });
});

describe('[E2E][P0] 1-5 rotation round-trip (reliability)', () => {
  it('[P0] portrait -> landscape -> portrait is stable (no NaN, no negative, bands flip)', () => {
    // Given rapid rotation (DW-6 transient shape, debounced upstream)
    // When the pure seam runs the round-trip
    // Then bands flip 96->48->96, boards stay finite and non-negative
    const p1 = layoutFor(PORTRAIT_PHONE);
    const l = layoutFor(LANDSCAPE_PHONE);
    const p2 = layoutFor(PORTRAIT_PHONE);
    assert.deepStrictEqual(p1, p2);
    for (const [label, r] of [['p1', p1], ['l', l], ['p2', p2]] as const) {
      assert.ok(Number.isFinite(r.boardSize), `${label} finite`);
      assert.ok(r.boardSize >= 0, `${label} non-negative`);
    }
    assert.strictEqual(p1.bandHeight, 96);
    assert.strictEqual(l.bandHeight, 48);
  });
});

describe('[E2E][P1] 1-5 pause-reachability + sub-floor journeys', () => {
  it('[P1] pause fits the thinnest band and composition keeps it top-right', () => {
    // Given the exact-fit risk (band 48 vs HIT_TARGET 48, zero slack — R-004)
    // When the analytic fit + Hud/App composition are checked
    // Then the button fits without overflow and the slots exist in both bands
    assert.strictEqual(HIT_TARGET_EXPECTED, LANDSCAPE_BAND_HEIGHT_EXPECTED);
    const hudSrc = readSource('triade/src/ui/Hud.tsx');
    const appSrc = readSource('triade/App.tsx');
    assertContains(hudSrc, 'PauseButton', 'Hud/pause slot present');
    assertContains(hudSrc, 'pauseSlot', 'Hud/portrait top-right slot');
    assertContains(hudSrc, 'zIndex: 1', 'Hud/overlay above content');
    assertContains(appSrc, '<Hud', 'App/Hud mounted');
  });

  it('[P1] cramped container: scaling fallback, never clips or throws', () => {
    // Given a container too small for the 216 floor (AC-1 re-run path)
    // When the composed seam runs
    // Then the board is the available 72 (< floor), finite, non-negative
    const r = layoutFor(CRAMPED_CONTAINER);
    assert.strictEqual(r.boardSize, 72);
    assert.ok(r.boardSize >= 0 && Number.isFinite(r.boardSize));
    assert.strictEqual(getBandTop(ZERO_INSETS, r.bandHeight), 16 + r.bandHeight);
  });

  it('[P1][MANUAL] operator rotation session (closes R-001/R-002 — owner: Eduardo)', () => {
    // Given a dev build on the iOS simulator (iPhone 17 Pro per story record)
    // When the operator boots portrait, confirms UX-DR-7 HUD, rotates (Cmd+arrow),
    //   confirms the thin 22/11pt band + dominant board + pause reachability both ways
    // Then evidence is recorded in the story completion note and 1.5 flips to done.
    // This test documents the gate — it asserts the analytic precondition is green
    // so the manual session starts from a known-good composed state.
    const p = layoutFor(PORTRAIT_PHONE);
    const l = layoutFor(LANDSCAPE_PHONE);
    assert.strictEqual(p.boardSize, 358);
    assert.strictEqual(l.boardSize, 289);
    // Manual session owed — tracked, not passed, by the operator_actions checklist.
  });
});
