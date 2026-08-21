import { test } from 'node:test';
import assert from 'node:assert';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { PauseButton, HIT_TARGET } from '../../../src/ui/PauseButton.tsx';

function renderPause(props: any = {}) {
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(PauseButton, props));
  });
  return renderer!;
}

test('PauseButton renders a pressable button labeled "Pausar"', () => {
  const renderer = renderPause();
  const pressable = renderer.root.findByProps({ accessibilityLabel: 'Pausar' });
  assert.strictEqual(pressable.props.accessibilityRole, 'button');
});

test('PauseButton fires onPress when pressed', () => {
  let pressed = 0;
  const renderer = renderPause({
    onPress: () => {
      pressed++;
    }
  });
  const pressable = renderer.root.findByProps({ accessibilityRole: 'button' });
  act(() => {
    pressable.props.onPress();
  });
  assert.strictEqual(pressed, 1, 'pressing the pause button must invoke onPress');
});

test('PauseButton honors a missing onPress without throwing', () => {
  const renderer = renderPause();
  const pressable = renderer.root.findByProps({ accessibilityRole: 'button' });
  assert.doesNotThrow(() => {
    act(() => {
      pressable.props.onPress?.();
    });
  });
});

test('PauseButton exposes the 48px hit target constant', () => {
  assert.strictEqual(HIT_TARGET, 48);
});
