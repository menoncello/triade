import { test } from 'node:test';
import assert from 'node:assert';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { SAFE_MARGIN } from '../../../src/ui/layout.ts';

const SPEC = '../../../src/ui/ToneScreen.tsx';
const insets = { top: 10, bottom: 10, left: 10, right: 10 };

async function renderTone(props: any): Promise<TestRenderer.ReactTestRenderer> {
  const { ToneScreen } = await import(SPEC);
  let r: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(ToneScreen, props));
  });
  return r!;
}

test('[P0] ToneScreen renders dark slate, tile and copy with a11y', async () => {
  const renderer = await renderTone({ insets, onDismiss: () => {} });
  const json = JSON.stringify(renderer.toJSON());
  assert.ok(json.includes('#1a1d23'), 'root must be dark slate #1a1d23');
  assert.ok(json.includes('tone-tile') || json.includes('tone-tile') , 'tile testID must exist');
  // check copy
  const texts = renderer.root.findAll((n: any) => n.type === 'Text').map((n: any) => {
    const c = n.props.children;
    if (Array.isArray(c)) return c.join('');
    return String(c ?? '');
  });
  assert.ok(texts.some((t: string) => t.includes('controle sobre o caos')), `copy must contain controle sobre o caos; got ${texts.join('|')}`);
  // a11y
  const pressable = renderer.root.findAll((n: any) => n.type === 'Pressable')[0];
  assert.ok(pressable, 'Pressable must exist');
  assert.equal(pressable.props.accessibilityRole, 'button');
  assert.equal(pressable.props.accessibilityLabel, 'Pular');
});

test('[P0] ToneScreen onDismiss called on press', async () => {
  let called = 0;
  const renderer = await renderTone({ insets, onDismiss: () => called++ });
  const pressable = renderer.root.findAll((n: any) => n.type === 'Pressable')[0];
  act(() => pressable.props.onPress());
  assert.equal(called, 1);
});

test('[P0] ToneScreen does not auto-dismiss synchronously (requires 2s)', async () => {
  let called = 0;
  const renderer = await renderTone({ insets, onDismiss: () => called++ });
  // synchronous check — should not have fired yet
  assert.equal(called, 0, 'onDismiss must not fire synchronously');
  // unmount cleans timer without calling onDismiss
  act(() => renderer.unmount());
  assert.equal(called, 0, 'unmount must not trigger onDismiss');
});

test('[P0] ToneScreen uses SAFE_MARGIN in layout', async () => {
  const renderer = await renderTone({ insets, onDismiss: () => {} });
  const json = JSON.stringify(renderer.toJSON());
  // should contain sum insets.top + SAFE_MARGIN = 10+16=26 etc.
  assert.ok(json.includes(String(insets.top + SAFE_MARGIN)) || json.includes(String(SAFE_MARGIN)), 'should use SAFE_MARGIN');
});
