import { test } from 'node:test';
import assert from 'node:assert';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { SAFE_MARGIN } from '../../../src/ui/layout.ts';
import { HIT_TARGET } from '../../../src/ui/PauseButton.tsx';

const SPEC = '../../../src/ui/TutorialOverlay.tsx';
const insets = { top: 10, bottom: 10, left: 10, right: 10 };

async function renderTutorial(props: any): Promise<TestRenderer.ReactTestRenderer> {
  const { TutorialOverlay } = await import(SPEC);
  let r: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(TutorialOverlay, props));
  });
  return r!;
}

function findByLabel(root: any, label: string): any | null {
  const all = root.findAll((n: any) => n.props && n.props.accessibilityLabel === label);
  return all[0] ?? null;
}

test('[P0] TutorialOverlay renders cue for merge12 and Pular button with 44pt and a11y', async () => {
  const renderer = await renderTutorial({ phase: 'merge12', insets, onSkip: () => {} });
  const textNodes = renderer.root.findAll((n: any) => n.type === 'Text');
  const texts = textNodes.map((n: any) => {
    const c = n.props.children;
    if (Array.isArray(c)) return c.join('');
    return String(c ?? '');
  });
  assert.ok(texts.some((t: string) => t && t.includes('1') && t.includes('2')), `merge12 cue must mention 1 e 2; got ${texts.join('|')}`);
  const btn = findByLabel(renderer.root, 'Pular tutorial');
  assert.ok(btn, 'skip button must have accessibilityLabel Pular tutorial');
  assert.equal(btn.props.accessibilityRole, 'button');
  // 44pt guard via style collection
  const styles: any[] = [];
  renderer.root.findAll((n: any) => n.props?.style).forEach((n: any) => {
    const raw = n.props.style;
    const layers = Array.isArray(raw) ? raw : [raw];
    for (const s of layers) if (s && typeof s === 'object') styles.push(s);
  });
  assert.ok(styles.some((s) => s.minHeight >= HIT_TARGET || s.minWidth >= HIT_TARGET), 'skip button must meet 44pt');
});

test('[P0] TutorialOverlay per-phase text and null on completed', async () => {
  const r1 = await renderTutorial({ phase: 'oneCell', insets, onSkip: () => {} });
  const texts1 = r1.root.findAll((n: any) => n.type === 'Text').map((n: any) => String(n.props.children ?? ''));
  assert.ok(JSON.stringify(texts1).includes('uma casa') || JSON.stringify(texts1).includes('mova'), 'oneCell cue must be present');
  let r2: TestRenderer.ReactTestRenderer;
  const { TutorialOverlay } = await import(SPEC);
  act(() => {
    r2 = TestRenderer.create(React.createElement(TutorialOverlay, { phase: 'completed', insets, onSkip: () => {} }));
  });
  assert.equal(r2!.toJSON(), null, 'completed renders null');
});

test('[P0] TutorialOverlay onSkip called and safe-margin padding used', async () => {
  let called = 0;
  const renderer = await renderTutorial({ phase: 'merge12', insets, onSkip: () => called++ });
  const btn = findByLabel(renderer.root, 'Pular tutorial');
  act(() => btn.props.onPress());
  assert.equal(called, 1);
  const json = JSON.stringify(renderer.toJSON());
  assert.ok(json.includes(String(insets.top + SAFE_MARGIN)) || json.includes(String(SAFE_MARGIN)), 'should use SAFE_MARGIN in layout');
});
