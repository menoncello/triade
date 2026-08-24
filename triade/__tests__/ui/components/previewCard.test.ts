import { test } from 'node:test';
import assert from 'node:assert';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { PreviewCard } from '../../../src/ui/PreviewCard.tsx';
import type { Preview } from '../../../src/game/preview.ts';

function renderCard(preview: Preview, label?: string) {
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(PreviewCard, { preview, ...(label ? { label } : {}) }));
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

// AC6 — the card is chrome, not the board: no feel/animation props.
const hasNoAnimationProps = (renderer: TestRenderer.ReactTestRenderer) =>
  renderer.root
    .findAll((node) => typeof node.type === 'string')
    .every((node) => {
      const p = node.props ?? {};
      return !('transform' in p) && !('Animated' in p) && p.animated !== true;
    });

test('[P0] AC2 — exact preview renders the value as its own Text node', () => {
  const renderer = renderCard({ kind: 'exact', value: 12 });
  const t = allText(renderer);
  assert.ok(hasToken(t, '12'), 'exact value should render as its own text node');
});

test('[P0] AC2 — range preview renders values joined by "/"', () => {
  const renderer = renderCard({ kind: 'range', values: [3, 6, 12] });
  const t = allText(renderer);
  const joined = t.find((p) => p.includes('/'));
  assert.ok(joined, 'range should render a joined token');
  assert.ok(joined!.includes('3/6/12'), `expected 3/6/12, got ${joined}`);
});

test('[P0] AC5 — value text uses accent ink #E8A33D at 20pt', () => {
  const renderer = renderCard({ kind: 'exact', value: 12 });
  assert.ok(
    hasStyle(renderer, { color: '#E8A33D', fontSize: 20 }),
    'value text must be accent #E8A33D at fontSize 20'
  );
});

test('[P0] AC5 — card chrome (light theme shipped): #f1eee6 fill, #c9c4b8 border, 12pt radius', () => {
  const renderer = renderCard({ kind: 'exact', value: 12 });
  assert.ok(
    hasStyle(renderer, { backgroundColor: '#f1eee6', borderColor: '#c9c4b8', borderRadius: 12 }),
    'card must use the shipped light-theme chrome'
  );
});

test('[P0] AC5 — accessibilityLabel announces the next spawn', () => {
  const exact = renderCard({ kind: 'exact', value: 12 });
  const range = renderCard({ kind: 'range', values: [3, 6, 12] });
  assert.ok(
    exact.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string').length > 0,
    'exact card must expose an accessibilityLabel'
  );
  assert.ok(
    range.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string').length > 0,
    'range card must expose an accessibilityLabel'
  );
});

test('[P0] AC6 — card carries no animation/transform props (chrome, not board)', () => {
  const renderer = renderCard({ kind: 'exact', value: 12 });
  assert.ok(hasNoAnimationProps(renderer), 'card must have no animation/transform props');
});

// FR-45 — the `label` prop drives the per-lane caption and the a11y note. Pin the
// label render path (review P7 — PreviewCard label/a11y component test was missing).
test('[P0] AC3/FR-45 — label renders the lane caption and prefixes the a11y note', () => {
  const renderer = renderCard({ kind: 'exact', value: 12 }, 'Accelerated');
  const t = allText(renderer);
  assert.ok(hasToken(t, 'Accelerated'), 'label must render the lane caption');
  const a11y = renderer.root.find(
    (n) => typeof n.props?.accessibilityLabel === 'string'
  ).props.accessibilityLabel as string;
  assert.ok(a11y.includes('Accelerated'), 'a11y note must include the lane label');
});
