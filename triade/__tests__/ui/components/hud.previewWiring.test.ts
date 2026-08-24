import { test } from 'node:test';
import assert from 'node:assert';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { Hud } from '../../../src/ui/Hud.tsx';
import { previewFor } from '../../../src/game/preview.ts';
import type { PendingSpawn } from '../../../src/engine/core/types.ts';

const insets = { top: 10, left: 10, right: 10, bottom: 10 };

// The composition seam under test: App.tsx wires
//   previews={{ clean: previewFor(game.pendingSpawn), accelerated: previewFor(game.pendingSpawn) }}
// into <Hud>. This test drives that exact data path (real resolver -> real Hud)
// so a regression in the wiring is caught without rendering the whole Expo App.
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
test('[P0] AC1/AC3/F-4 — two distinct lane previews render through previewFor wiring', () => {
  const renderer = renderWired(
    { value: 3, displayRoll: 0.1 },
    {
      previews: {
        clean: previewFor({ value: 3, displayRoll: 0.1 }),
        accelerated: previewFor({ value: 12, displayRoll: 0.9 }),
      },
    }
  );
  const t = allText(renderer);
  assert.ok(hasToken(t, 'Clean'), 'Clean lane label must be present (FR-45)');
  assert.ok(hasToken(t, 'Accelerated'), 'Accelerated lane label must be present (FR-45)');
  assert.ok(hasToken(t, '3'), 'Clean lane shows its own exact value via previewFor');
  assert.ok(t.some((p) => p.includes('/')), 'Accelerated lane shows a joined range via previewFor');
  assert.ok(
    hasStyle(renderer, { width: 76, height: 76 }),
    'portrait lane boxes must keep the 76x76 AC4 chrome (both lanes)'
  );
});
