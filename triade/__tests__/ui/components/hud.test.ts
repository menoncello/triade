import { test } from 'node:test';
import assert from 'node:assert';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { Hud } from '../../../src/ui/Hud.tsx';

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
