import { test } from 'node:test';
import assert from 'node:assert';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { Hud } from '../../../src/ui/Hud.tsx';
import type { Preview } from '../../../src/game/preview.ts';

const insets = { top: 10, left: 10, right: 10, bottom: 10 };

function renderHud(props: any = {}) {
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(Hud, {
        score: 123,
        best: 456,
        isLandscape: false,
        insets,
        bandHeight: 40,
        // `previews` is now a required prop; default fixture keeps existing tests
        // green. An exact preview per lane — DISTINCT values (clean 3, accelerated 6)
        // so the per-lane value assertions catch a missing-lane regression (review P8)
        // rather than matching on a shared token. Fanned out to both lanes (FR-45).
        previews: {
          clean: { kind: 'exact', value: 3 },
          accelerated: { kind: 'exact', value: 6 },
        } as any,
        ...props
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

test('Hud renders the score and best (Recorde) in portrait', () => {
  const renderer = renderHud();
  const t = allText(renderer);
  assert.ok(hasToken(t, '123'), 'score should be rendered as its own text node');
  assert.ok(hasToken(t, '456'), 'best value should be rendered as its own text node');
  assert.ok(t.some((p) => p.includes('Recorde')), 'best label should be present');
  assert.ok(hasToken(t, '3'), 'portrait preview should render the pending spawn value');
});

test('Hud renders a pause button in portrait', () => {
  const renderer = renderHud();
  const pause = renderer.root.findByProps({ accessibilityLabel: 'Pausar' });
  assert.strictEqual(pause.props.accessibilityRole, 'button');
  // portrait-specific layout marker: the square portrait preview
  assert.ok(
    hasStyle(renderer, { width: 76, height: 76 }),
    'portrait should render the square preview panel'
  );
});

test('Hud switches to the landscape layout when isLandscape is true', () => {
  const renderer = renderHud({ isLandscape: true });
  const t = allText(renderer);
  assert.ok(hasToken(t, '123'), 'landscape still renders the score');
  assert.ok(hasToken(t, '456'), 'landscape still renders the best value');
  assert.ok(t.some((p) => p.includes('Recorde')), 'landscape still renders the best label');
  assert.ok(hasToken(t, '3'), 'landscape preview should render the pending spawn value');
  // landscape-specific layout marker: the compact horizontal preview band
  // (absent in portrait, so this test cannot pass with the portrait tree)
  assert.ok(
    hasStyle(renderer, { minWidth: 60, height: 44 }),
    'landscape should render the compact landscape preview band'
  );
});

test('Hud renders without throwing for zero score/best', () => {
  assert.doesNotThrow(() => {
    renderHud({ score: 0, best: 0 });
  });
});

// F-1 (test-review 7.2): the RANGE preview path through Hud -> PreviewCard
// (joined '/' token) was only covered at component level. Pin it at the
// HUD-wiring level so a regression in how Hud forwards a range preview fails
// the integration suite. AC1/AC2 at the wiring layer, both orientations.
test('[P0] AC2/F-1 — Hud shows the joined range token in portrait', () => {
  const range = { kind: 'range', values: [3, 6, 12] } as Preview;
  const renderer = renderHud({ previews: { clean: range, accelerated: range } });
  const t = allText(renderer);
  assert.ok(hasToken(t, '3/6/12'), 'portrait preview should join the range values with /');
});

test('[P0] AC2/F-1 — Hud shows the joined range token in landscape', () => {
  const range = { kind: 'range', values: [3, 6, 12] } as Preview;
  const renderer = renderHud({ isLandscape: true, previews: { clean: range, accelerated: range } });
  const t = allText(renderer);
  assert.ok(hasToken(t, '3/6/12'), 'landscape preview should join the range values with /');
});

// F-4 (test-review 7.2): AC3 "shown in both Clean and Accelerated lanes"
// (FR-45) was single-lane by scope guard. Pin the two-lane fan-out at the
// HUD-wiring level: distinct lane labels + both orientations render.
test('[P0] AC3/F-4 — Hud renders labeled previews for both Clean and Accelerated lanes', () => {
  const renderer = renderHud({
    previews: {
      clean: { kind: 'exact', value: 3 } as Preview,
      accelerated: { kind: 'range', values: [3, 6, 12] } as Preview,
    },
  });
  const t = allText(renderer);
  assert.ok(hasToken(t, 'Clean'), 'Clean lane label must be present');
  assert.ok(hasToken(t, 'Accelerated'), 'Accelerated lane label must be present');
  assert.ok(hasToken(t, '3'), 'Clean lane shows its exact value');
  assert.ok(hasToken(t, '3/6/12'), 'Accelerated lane shows its joined range');
});
