import { test } from 'node:test';
import assert from 'node:assert';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';

const SPEC = '../../../src/ui/PauseOverlay.tsx';

const DARK_CHROME = {
  surfaceRaised: '#2B2F38',
  text: '#F2EEE3',
  muted: '#A39C8F',
  border: '#3A3F49',
  accent: '#E8A33D',
  accentInk: '#1C1206',
};

function baseProps(overrides: any = {}): any {
  return {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    reducedMotion: true,
    chrome: DARK_CHROME,
    theme: 'dark',
    onThemeChange: () => {},
    language: 'pt',
    motionReduced: false,
    onReducedMotionChange: () => {},
    onResume: () => {},
    onRestart: () => {},
    onLanes: () => {},
    ...overrides,
  };
}

async function renderPause(props: any): Promise<TestRenderer.ReactTestRenderer> {
  const { PauseOverlay } = await import(SPEC);
  let r: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(PauseOverlay, props));
  });
  return r!;
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

function pressByLabel(renderer: TestRenderer.ReactTestRenderer, label: string): void {
  const node = renderer.root.find(
    (n) => (n.type as string) !== 'Text' && n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function',
  );
  act(() => {
    node.props.onPress();
  });
}

test('[P0] Pause sheet renders title + resume/restart/lanes actions (pt)', async () => {
  const { i18n } = await import('../../../src/i18n/index.ts');
  await i18n.changeLanguage('pt');
  const t = allText(await renderPause(baseProps()));
  assert.ok(t.some((p) => p.includes('Pausa')), 'title Pausa must render');
  assert.ok(t.some((p) => p.includes('Continuar')), 'resume Continuar must render');
  assert.ok(t.some((p) => p.includes('Jogar de novo')), 'restart must render');
  assert.ok(t.some((p) => p.includes('Pistas')), 'lanes must render');
  assert.ok(t.some((p) => p.includes('Movimento reduzido')), 'reduced-motion row must render');
});

test('[P0] Pause actions dispatch resume/restart/lanes callbacks', async () => {
  const { i18n } = await import('../../../src/i18n/index.ts');
  await i18n.changeLanguage('pt');
  const calls: string[] = [];
  const renderer = await renderPause(
    baseProps({
      onResume: () => calls.push('resume'),
      onRestart: () => calls.push('restart'),
      onLanes: () => calls.push('lanes'),
    }),
  );
  pressByLabel(renderer, 'Continuar');
  pressByLabel(renderer, 'Jogar de novo');
  pressByLabel(renderer, 'Pistas');
  assert.deepStrictEqual(calls, ['resume', 'restart', 'lanes']);
});

test('[P0] Pause sheet honors theme chrome (dark text on dark)', async () => {
  const { i18n } = await import('../../../src/i18n/index.ts');
  await i18n.changeLanguage('pt');
  const renderer = await renderPause(baseProps());
  const styles: Array<Record<string, any>> = [];
  renderer.root.findAll((node) => node.props?.style).forEach((node) => {
    const raw = node.props.style;
    (Array.isArray(raw) ? raw : [raw]).forEach((s) => {
      if (typeof s === 'object' && s !== null) styles.push(s);
    });
  });
  assert.ok(styles.some((s) => s.backgroundColor === DARK_CHROME.surfaceRaised), 'card must use surfaceRaised bg');
  assert.ok(styles.some((s) => s.color === DARK_CHROME.text), 'title/buttons must use chrome text');
  assert.ok(styles.some((s) => s.backgroundColor === DARK_CHROME.accent), 'resume CTA must use accent bg');
});

test('[P0] Pause theme row + reduced-motion switch dispatch changes', async () => {
  const { i18n } = await import('../../../src/i18n/index.ts');
  await i18n.changeLanguage('pt');
  const seen: string[] = [];
  let motion: boolean | null = null;
  const renderer = await renderPause(
    baseProps({
      theme: 'dark',
      onThemeChange: (id: string) => seen.push(id),
      motionReduced: false,
      onReducedMotionChange: (v: boolean) => {
        motion = v;
      },
    }),
  );
  pressByLabel(renderer, 'Claro');
  assert.deepStrictEqual(seen, ['light']);
  pressByLabel(renderer, 'Movimento reduzido');
  assert.strictEqual(motion, true);
});
