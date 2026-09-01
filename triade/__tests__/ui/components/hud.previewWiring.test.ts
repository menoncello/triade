import { test } from 'node:test';
import assert from 'node:assert';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { Hud } from '../../../src/ui/Hud.tsx';
import { previewFor } from '../../../src/game/preview.ts';
import type { Board, PendingSpawn } from '../../../src/engine/core/types.ts';
import { ceilingDetector, tierForCeiling } from '../../../src/engine/core/index.ts';
import { potForTier } from '../../../src/engine/core/pot.ts';

const insets = { top: 10, left: 10, right: 10, bottom: 10 };

// The composition seam under test: App.tsx wires (FR-43, Story 7.3)
//   const availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)));
//   previews={{ clean: previewFor(game.pendingSpawn, availablePot), accelerated: previewFor(game.pendingSpawn, availablePot) }}
// into <Hud>. This test drives that exact data path (real resolver -> real Hud)
// so a regression in the wiring is caught without rendering the whole Expo App.
function boardWithCeiling(max: number): Board {
  const empty: Board = Array.from({ length: 4 }, () => Array<number | null>(4).fill(2));
  empty[0][0] = max;
  return empty;
}

function wiredPreviewForBoard(board: Board, pending: PendingSpawn) {
  const availablePot = potForTier(tierForCeiling(ceilingDetector(board)));
  return previewFor(pending, availablePot);
}

function renderWired(pending: PendingSpawn, props: any = {}) {
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(Hud, {
        score: 123,
        best: 456,
        isLandscape: false,
        insets,
        bandHeight: 40,
        previews: { clean: previewFor(pending), accelerated: previewFor(pending) },
        ...props,
      })
    );
  });
  return renderer!;
}

function allText(renderer: TestRenderer.ReactTestRenderer): string[] {
  const parts: string[] = [];
  const walk = (c: any) => {
    if (Array.isArray(c)) c.forEach(walk);
    else if (c !== null && c !== undefined) parts.push(String(c));
  };
  renderer.root
    .findAll((node) => (node.type as string) === 'Text')
    .forEach((n) => walk(n.props.children));
  return parts;
}

const hasToken = (parts: string[], token: string) => parts.some((p) => p.trim() === token);
const hasStyle = (renderer: TestRenderer.ReactTestRenderer, match: Record<string, any>) =>
  renderer.root.findAll((node) => {
    const raw = node.props?.style;
    const layers = Array.isArray(raw) ? raw : [raw];
    return layers.some(
      (style) =>
        typeof style === 'object' && style !== null && Object.entries(match).every(([k, v]) => style[k] === v)
    );
  }).length > 0;

test('[P0] AC1/AC2 — exact pending (displayRoll < 0.6) renders its value through the Hud', () => {
  // AC1: reads game.pendingSpawn (here, the wired pending) without re-rolling.
  // AC2: <0.6 yields the exact value, surfaced verbatim by the Hud/PreviewCard.
  const renderer = renderWired({ value: 12, displayRoll: 0.2 });
  const t = allText(renderer);
  assert.ok(hasToken(t, '12'), 'Hud must show the exact pending value 12 derived via previewFor');
  assert.ok(
    hasStyle(renderer, { width: 76, height: 76 }),
    'portrait preview panel must still be the 76x76 chrome (AC4 preserved)'
  );
});

test('[P0] AC1/AC2 — range pending (displayRoll >= 0.6) renders a joined window through the Hud', () => {
  const renderer = renderWired({ value: 12, displayRoll: 0.9 });
  const t = allText(renderer);
  const joined = t.find((p) => p.includes('/'));
  assert.ok(joined, 'Hud must surface the range preview as a joined token via previewFor');
  assert.ok(joined!.includes('12'), `range must contain the pending value 12, got ${joined}`);
});

test('[P0] AC1/AC4 — landscape wiring reuses the same previewFor output (compact 60x44 band)', () => {
  const renderer = renderWired({ value: 3, displayRoll: 0.1 }, { isLandscape: true });
  const t = allText(renderer);
  assert.ok(hasToken(t, '3'), 'landscape Hud must show the exact pending value derived via previewFor');
  assert.ok(
    hasStyle(renderer, { minWidth: 60, height: 44 }),
    'landscape preview band must be the compact 60x44 chrome (AC4 preserved)'
  );
});

// F-4 (test-review 7.2): AC3 "shown in both Clean and Accelerated lanes" (FR-45)
// was single-lane by scope guard. Pin the two-lane fan-out through the real
// previewFor seam: each lane reads its own pre-resolved pending without re-rolling.
// 3.2: Hud now displays only activeLaneId preview — fan-out prop kept, rendering gated.
test('[P0] AC1/AC3/F-4 — two distinct lane previews render through previewFor wiring (activeLaneId gate)', () => {
  const cleanPrev = previewFor({ value: 3, displayRoll: 0.1 });
  const accPrev = previewFor({ value: 12, displayRoll: 0.9 });

  const rClean = renderWired({ value: 3, displayRoll: 0.1 }, { previews: { clean: cleanPrev, accelerated: accPrev }, activeLaneId: 'clean' });
  const tClean = allText(rClean);
  assert.ok(hasToken(tClean, 'Clean'), 'Clean lane label must be present when activeLaneId=clean (FR-45)');
  assert.ok(!hasToken(tClean, 'Accelerated'), 'Accelerated must NOT be present when activeLaneId=clean');
  assert.ok(hasToken(tClean, '3'), 'Clean lane shows its own exact value via previewFor');
  assert.ok(!tClean.some((p) => p.includes('/')), 'Clean exact must not show joined range');

  const rAcc = renderWired({ value: 3, displayRoll: 0.1 }, { previews: { clean: cleanPrev, accelerated: accPrev }, activeLaneId: 'accelerated' });
  const tAcc = allText(rAcc);
  assert.ok(hasToken(tAcc, 'Accelerated'), 'Accelerated lane label must be present when activeLaneId=accelerated (FR-45)');
  assert.ok(!hasToken(tAcc, 'Clean'), 'Clean must NOT be present when activeLaneId=accelerated');
  assert.ok(tAcc.some((p) => p.includes('/')), 'Accelerated lane shows a joined range via previewFor');
  assert.ok(
    hasStyle(rAcc, { width: 76, height: 76 }),
    'portrait lane boxes must keep the 76x76 AC4 chrome'
  );
});

// ===== Story 7.3 — FR-43 availability wiring through Hud (code-review patch 2026-08-25) =====
// The prior seam pinned previewFor(pending) single-arg (default full ladder). Since
// 7.3, App.tsx threads the live ceiling:
//   availablePot = potForTier(tierForCeiling(ceilingDetector(board)))
//   previewFor(pending, availablePot)
// These pins drive that real seam through the Hud composition layer so a regression
// in the ceiling→preview→Hud path is caught (mirrors preview-availability.integration.test.ts,
// but at the component boundary).

test('[P0] AC3/FR-43 — Hud wiring: low ceiling (only 3 available) collapses value 3 to "3" (no join)', () => {
  // Arrange: board ceiling 24 → tier 0 → availablePot [3]
  const board = boardWithCeiling(24);
  const pending = { value: 3, displayRoll: 0.9 } as PendingSpawn;
  const wired = wiredPreviewForBoard(board, pending);
  // Act
  const renderer = renderWired(pending, {
    previews: { clean: wired, accelerated: wired },
  });
  const t = allText(renderer);
  // Assert: PreviewCard for [3] renders "3" without "/" — proves single-element window
  assert.deepStrictEqual(wired, { kind: 'range', values: [3] }, 'low ceiling must produce range [3]');
  assert.ok(hasToken(t, '3'), 'Hud must surface single token "3" for collapsed range [3]');
  assert.ok(!t.some((p) => p.includes('/')), 'collapsed [3] must not render as joined "3/6" through Hud');
});

test('[P0] AC4/FR-43 — Hud wiring: rising ceiling widens range as joined slice through Hud', () => {
  // Arrange: ceilings 48→[3,6], 96→[3,6,12], 192→[3,6,12,24]
  const cases: Array<{ ceiling: number; value: number; expectedJoined: string }> = [
    { ceiling: 48, value: 3, expectedJoined: '3/6' },
    { ceiling: 96, value: 3, expectedJoined: '3/6/12' },
    { ceiling: 192, value: 6, expectedJoined: '6/12/24' },
  ];
  for (const { ceiling, value, expectedJoined } of cases) {
    const board = boardWithCeiling(ceiling);
    const pending = { value, displayRoll: 0.9 } as PendingSpawn;
    const wired = wiredPreviewForBoard(board, pending);
    // Act
    const renderer = renderWired(pending, {
      previews: { clean: wired, accelerated: wired },
    });
    const t = allText(renderer);
    const joined = t.find((p) => p.includes('/'));
    // Assert
    assert.ok(joined, `ceiling ${ceiling} value ${value} must render a joined token through Hud`);
    assert.ok(
      joined!.includes(expectedJoined),
      `ceiling ${ceiling} value ${value} expected joined "${expectedJoined}", got "${joined}"`
    );
    assert.ok(joined!.includes(String(value)), `joined token must contain pending value ${value}`);
  }
});

test('[P0] AC2/FR-43 — Hud wiring: value 1/2 always renders "1/2" independent of board ceiling', () => {
  for (const ceiling of [24, 48, 96, 192]) {
    for (const value of [1, 2]) {
      // Arrange
      const board = boardWithCeiling(ceiling);
      const pending = { value, displayRoll: 0.9 } as PendingSpawn;
      const wired = wiredPreviewForBoard(board, pending);
      // Act
      const renderer = renderWired(pending, {
        previews: { clean: wired, accelerated: wired },
      });
      const t = allText(renderer);
      const joined = t.find((p) => p.includes('/'));
      // Assert
      assert.deepStrictEqual(wired, { kind: 'range', values: [1, 2] }, `value ${value} ceiling ${ceiling} must produce [1,2]`);
      assert.ok(joined, `value ${value} ceiling ${ceiling} must surface a joined token through Hud`);
      assert.ok(joined!.includes('1/2'), `value ${value} must render "1/2" through Hud, got "${joined}"`);
    }
  }
});

test('[P0] AC5/FR-43 — Hud wiring derives availablePot from live board ceiling (not hardcoded ladder)', () => {
  // Arrange: same pending, two boards with different ceilings → different previews → different Hud text
  const lowBoard = boardWithCeiling(24); // [3]
  const highBoard = boardWithCeiling(96); // [3,6,12]
  const pending = { value: 3, displayRoll: 0.9 } as PendingSpawn;
  const lowWired = wiredPreviewForBoard(lowBoard, pending);
  const highWired = wiredPreviewForBoard(highBoard, pending);
  // Assert wiring determinism first
  assert.notDeepStrictEqual(lowWired, highWired, 'same pending must yield different preview when ceiling differs');

  const rLow = renderWired(pending, { previews: { clean: lowWired, accelerated: lowWired } });
  const rHigh = renderWired(pending, { previews: { clean: highWired, accelerated: highWired } });

  const tLow = allText(rLow);
  const tHigh = allText(rHigh);
  // Assert: Hud text reflects the derived availability
  assert.ok(hasToken(tLow, '3'), 'low-ceiling Hud must show single "3"');
  assert.ok(!tLow.some((p) => p.includes('/')), 'low-ceiling Hud must not show a joined range');
  const highJoined = tHigh.find((p) => p.includes('/'));
  assert.ok(highJoined, 'high-ceiling Hud must show a joined range');
  assert.ok(highJoined!.includes('3/6'), `high-ceiling joined token must include "3/6", got "${highJoined}"`);
});

test('[P0] AC7/FR-41-42 — Hud wiring: exact path (<0.6) ignores board ceiling (no regression)', () => {
  for (const ceiling of [24, 48, 96, 192]) {
    const board = boardWithCeiling(ceiling);
    const pending = { value: 12, displayRoll: 0.1 } as PendingSpawn;
    const wired = wiredPreviewForBoard(board, pending);
    // Act
    const renderer = renderWired(pending, {
      previews: { clean: wired, accelerated: wired },
    });
    const t = allText(renderer);
    // Assert: exact path returns single token irrespective of availablePot
    assert.deepStrictEqual(wired, { kind: 'exact', value: 12 }, `ceiling ${ceiling} exact path must be {exact,12}`);
    assert.ok(hasToken(t, '12'), `ceiling ${ceiling} Hud must surface exact "12" through wiring`);
    assert.ok(!t.some((p) => p.includes('/')), `ceiling ${ceiling} exact "12" must not render as range through Hud`);
  }
});
